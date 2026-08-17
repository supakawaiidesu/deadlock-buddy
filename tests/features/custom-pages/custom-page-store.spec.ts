import { describe, expect, it, vi } from 'vitest';
import {
  createCustomPage,
  createEmptyCustomPageStore,
  CUSTOM_PAGES_STORAGE_KEY,
  getCustomPageCloseDestination,
  readCustomPageStore,
  removeCustomPage,
  renameCustomPage,
  sanitizeCustomPageStore,
  importSharedCustomPages,
  updateCustomPageLayout,
  writeCustomPageStore,
} from '@/features/custom-pages/custom-page-state';
import type { DashboardPanelInstance } from '@/features/dashboard/dashboard-types';
import { ShareProfileV2Schema } from '@/lib/api/schema';
const sharedWidgets: DashboardPanelInstance[] = [
  { id: 'rank', type: 'rank-distribution', x: 1, y: 0, w: 2, h: 10 },
];

describe('custom page store', () => {
  it('returns an empty store for missing, malformed, or blocked storage', () => {
    const empty = createEmptyCustomPageStore();
    expect(readCustomPageStore({ getItem: () => null })).toEqual(empty);
    expect(readCustomPageStore({ getItem: () => '{bad' })).toEqual(empty);
    expect(
      readCustomPageStore({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual(empty);
  });

  it('sanitizes records in order without mutating the fixture and keeps the first duplicate ID', () => {
    const fixture = {
      version: 1,
      nextTabNumber: 1,
      tabs: [
        { id: 'first', title: ' Tab 7 ', widgets: [] },
        { id: 'duplicate', title: 'Original', widgets: sharedWidgets },
        { id: 'duplicate', title: 'Ignored', widgets: [] },
        {
          id: 'partial',
          title: 'Partial',
          widgets: [
            { id: 'unknown', type: 'unknown', x: 0, y: 0, w: 1, h: 1 },
            { id: 'valid', type: 'telemetry-snapshot', x: 9, y: 0, w: 1, h: 1 },
          ],
        },
      ],
    };
    const before = structuredClone(fixture);

    const store = sanitizeCustomPageStore(fixture);

    expect(fixture).toEqual(before);
    expect(store.tabs.map(({ id, tabNumber, title }) => ({ id, tabNumber, title }))).toEqual([
      { id: 'first', tabNumber: 7, title: 'Tab 7' },
      { id: 'duplicate', tabNumber: 1, title: 'Original' },
      { id: 'partial', tabNumber: 2, title: 'Partial' },
    ]);
    expect(store.tabs[2].widgets).toEqual([
      { id: 'valid', type: 'telemetry-snapshot', x: 2, y: 0, w: 1, h: 9 },
    ]);
    expect(store.nextTabNumber).toBe(8);
  });

  it('drops invalid records and nonempty layouts with no supported widgets', () => {
    const store = sanitizeCustomPageStore({
      version: 1,
      nextTabNumber: 2,
      tabs: [
        { id: 'bad id', title: 'Bad ID', widgets: [] },
        { id: 'blank', title: '   ', widgets: [] },
        { id: 'root', title: 'Root', widgets: {} },
        {
          id: 'unsupported',
          title: 'Unsupported',
          widgets: [{ id: 'x', type: 'unknown' }],
        },
        { id: 'valid', title: 'Valid', widgets: [] },
      ],
    });

    expect(store.tabs).toEqual([
      { id: 'valid', tabNumber: 1, title: 'Valid', widgets: [] },
    ]);
    expect(store.nextTabNumber).toBe(2);
  });

  it('writes under the custom-pages key and swallows blocked writes', () => {
    const setItem = vi.fn();
    const store = createEmptyCustomPageStore();

    writeCustomPageStore({ setItem }, store);

    expect(setItem).toHaveBeenCalledWith(CUSTOM_PAGES_STORAGE_KEY, JSON.stringify(store));
    expect(() =>
      writeCustomPageStore(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        store,
      ),
    ).not.toThrow();
  });

  it('persists committed widget identity and geometry through storage', () => {
    const created = createCustomPage(createEmptyCustomPageStore(), { id: 'page' });
    const widgets: DashboardPanelInstance[] = [
      { id: 'rank-panel', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
      { id: 'hero-panel', type: 'hero-winrate', x: 1, y: 10, w: 1, h: 13 },
    ];
    const updated = updateCustomPageLayout(created.store, created.page.id, widgets);
    let persisted: string | null = null;
    const storage = {
      getItem: (key: string) =>
        key === CUSTOM_PAGES_STORAGE_KEY ? persisted : null,
      setItem: (key: string, value: string) => {
        if (key === CUSTOM_PAGES_STORAGE_KEY) persisted = value;
      },
    };

    writeCustomPageStore(storage, updated);
    const restored = readCustomPageStore(storage);

    expect(restored.tabs[0].widgets).toEqual(widgets);
  });

  it('imports an ordered batch atomically with fresh IDs and consecutive numbers', () => {
    const first = createCustomPage(createEmptyCustomPageStore(), { id: 'one' });
    const before = structuredClone(first.store);
    const imported = importSharedCustomPages(first.store, {
      version: 2,
      pages: [
        { title: 'Shared page', widgets: sharedWidgets },
        { title: 'Empty page', widgets: [] },
      ],
    });

    expect(first.store).toEqual(before);
    expect(imported.pages.map(({ tabNumber, title, widgets }) => ({
      tabNumber,
      title,
      widgets,
    }))).toEqual([
      { tabNumber: 2, title: 'Shared page', widgets: sharedWidgets },
      { tabNumber: 3, title: 'Empty page', widgets: [] },
    ]);
    expect(new Set(imported.pages.map((page) => page.id)).size).toBe(2);
    expect(imported.pages.every((page) => page.id !== first.page.id)).toBe(true);
    expect(imported.store.tabs.map((page) => page.title)).toEqual([
      'Tab 1',
      'Shared page',
      'Empty page',
    ]);
    expect(imported.store.nextTabNumber).toBe(first.store.nextTabNumber + 2);
  });

  it('clamps backend-valid wide widgets and vertically compacts collisions before storage', () => {
    const profile = ShareProfileV2Schema.parse({
      version: 2,
      pages: [{
        title: 'Colliding layout',
        widgets: [
          { id: 'wide', type: 'telemetry-snapshot', x: 9, y: 0, w: 12, h: 1 },
          { id: 'overlap', type: 'hero-popularity', x: 0, y: 0, w: 12, h: 1 },
        ],
      }],
    });

    const imported = importSharedCustomPages(createEmptyCustomPageStore(), profile);

    expect(imported.pages[0].widgets).toEqual([
      { id: 'wide', type: 'telemetry-snapshot', x: 0, y: 0, w: 3, h: 9 },
      { id: 'overlap', type: 'hero-popularity', x: 0, y: 9, w: 3, h: 7 },
    ]);
    expect(imported.store.tabs[0].widgets).toEqual(imported.pages[0].widgets);
  });

  it('rejects an invalid API profile before import without changing the existing store', () => {
    const existing = createCustomPage(createEmptyCustomPageStore(), { id: 'existing' });
    const before = JSON.stringify(existing.store);
    const validation = ShareProfileV2Schema.safeParse({
      version: 2,
      pages: [{
        title: 'Duplicate widget IDs',
        widgets: [
          { id: 'duplicate', type: 'hero-popularity', x: 0, y: 0, w: 1, h: 13 },
          { id: 'duplicate', type: 'hero-winrate', x: 1, y: 0, w: 1, h: 13 },
        ],
      }],
    });

    expect(validation.success).toBe(false);
    if (validation.success) importSharedCustomPages(existing.store, validation.data);
    expect(JSON.stringify(existing.store)).toBe(before);
  });

  it('keeps surviving names and the next local name after closing Tab 1', () => {
    const first = createCustomPage(createEmptyCustomPageStore(), { id: 'one' });
    const second = createCustomPage(first.store, { id: 'two' });
    const closed = removeCustomPage(second.store, 'one');
    const third = createCustomPage(closed, { id: 'three' });

    expect(closed.tabs[0].title).toBe('Tab 2');
    expect(third.page.title).toBe('Tab 3');
  });

  it('removes a closed page without consuming a tab number or recreating it', () => {
    const first = createCustomPage(createEmptyCustomPageStore(), { id: 'one' });
    const second = createCustomPage(first.store, { id: 'two' });
    const destination = getCustomPageCloseDestination(second.store.tabs, 'one');

    expect(destination?.id).toBe('two');
    const closed = removeCustomPage(second.store, 'one');
    const repeatedClose = removeCustomPage(closed, 'one');

    expect(closed.nextTabNumber).toBe(second.store.nextTabNumber);
    expect(closed.tabs.map((tab) => tab.id)).toEqual(['two']);
    expect(repeatedClose).toEqual(closed);
  });

  it('normalizes rename whitespace, blank fallback, and Unicode code-point length', () => {
    const created = createCustomPage(createEmptyCustomPageStore(), { id: 'page' });
    const trimmed = renameCustomPage(created.store, 'page', '  New title  ');
    const blank = renameCustomPage(trimmed, 'page', '   ');
    const limited = renameCustomPage(blank, 'page', '😀'.repeat(41));

    expect(trimmed.tabs[0].title).toBe('New title');
    expect(blank.tabs[0].title).toBe('New title');
    expect(Array.from(limited.tabs[0].title)).toHaveLength(40);
  });

  it('selects the right tab, then left tab, then Home when closing', () => {
    const tabs = [
      { id: 'one', tabNumber: 1, title: 'One', widgets: [] },
      { id: 'two', tabNumber: 2, title: 'Two', widgets: [] },
      { id: 'three', tabNumber: 3, title: 'Three', widgets: [] },
    ];

    expect(getCustomPageCloseDestination(tabs, 'two')?.id).toBe('three');
    expect(getCustomPageCloseDestination(tabs.slice(0, 2), 'two')?.id).toBe('one');
    expect(getCustomPageCloseDestination(tabs.slice(0, 1), 'one')).toBeNull();
  });
});
