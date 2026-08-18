import { describe, expect, it, vi } from 'vitest';
import {
  buildCustomPageShareDocument,
  createCustomPage,
  createEmptyCustomPageStore,
  CUSTOM_PAGES_STORAGE_KEY,
  getCustomPageCloseDestination,
  importSharedCustomPages,
  LEGACY_CUSTOM_PAGES_STORAGE_KEY,
  readCustomPageStore,
  removeCustomPage,
  renameCustomPage,
  sanitizeCustomPageStore,
  updateCustomPageLayout,
  writeCustomPageStore,
} from '@/features/custom-pages/custom-page-state';
import type { DashboardPanelInstance } from '@/features/dashboard/dashboard-types';
import { ShareProfileV2Schema, ShareProfileV3Schema } from '@/lib/api/schema';

const legacySharedWidgets = [
  { id: 'rank', type: 'rank-distribution' as const, x: 1, y: 0, w: 2, h: 10 },
];
const chartSettings = {
  heroIds: [1, 2],
  minUnixTimestamp: 1_700_000_000,
  minAverageBadge: 91,
  maxAverageBadge: 116,
};
const chartWidget: DashboardPanelInstance = {
  id: 'history',
  type: 'hero-winrate-over-time',
  x: 1,
  y: 0,
  w: 1,
  h: 3,
  settings: chartSettings,
};

describe('custom page store', () => {
  it('resolves current and legacy storage with exact precedence and migration state', () => {
    const current = { version: 2, nextTabNumber: 1, tabs: [] };
    const legacy = {
      version: 1,
      nextTabNumber: 2,
      tabs: [{
        id: 'legacy',
        title: 'Legacy',
        widgets: [{ id: 'telemetry', type: 'telemetry-snapshot', x: 2, y: 0, w: 1, h: 9 }],
      }],
    };
    const storage = {
      getItem: (key: string) => key === CUSTOM_PAGES_STORAGE_KEY
        ? JSON.stringify(current)
        : key === LEGACY_CUSTOM_PAGES_STORAGE_KEY ? JSON.stringify(legacy) : null,
    };

    expect(readCustomPageStore(storage)).toEqual({ store: current, migrated: false });

    const migrated = readCustomPageStore({
      getItem: (key: string) => key === CUSTOM_PAGES_STORAGE_KEY
        ? '{bad'
        : key === LEGACY_CUSTOM_PAGES_STORAGE_KEY ? JSON.stringify(legacy) : null,
    });
    expect(migrated).toEqual({
      store: {
        version: 2,
        nextTabNumber: 2,
        tabs: [{
          id: 'legacy',
          tabNumber: 1,
          title: 'Legacy',
          widgets: [{
            id: 'telemetry',
            type: 'telemetry-snapshot',
            x: 8,
            y: 0,
            w: 4,
            h: 9,
          }],
        }],
      },
      migrated: true,
    });

    expect(readCustomPageStore({
      getItem: (key: string) => key === LEGACY_CUSTOM_PAGES_STORAGE_KEY
        ? JSON.stringify({ version: 1, nextTabNumber: 1, tabs: [] })
        : null,
    })).toEqual({ store: createEmptyCustomPageStore(), migrated: true });

    expect(readCustomPageStore({ getItem: () => '{bad' })).toEqual({
      store: createEmptyCustomPageStore(),
      migrated: false,
    });
    expect(readCustomPageStore({
      getItem: () => { throw new Error('blocked'); },
    })).toEqual({ store: createEmptyCustomPageStore(), migrated: false });
  });

  it('sanitizes native version-2 records without mutating the fixture', () => {
    const fixture = {
      version: 2,
      nextTabNumber: 1,
      tabs: [
        { id: 'first', title: ' Tab 7 ', widgets: [] },
        { id: 'duplicate', title: 'Original', widgets: [{
          id: 'rank', type: 'rank-distribution', x: 4, y: 0, w: 8, h: 10,
        }] },
        { id: 'duplicate', title: 'Ignored', widgets: [] },
        {
          id: 'partial',
          title: 'Partial',
          widgets: [
            { id: 'unknown', type: 'unknown', x: 0, y: 0, w: 1, h: 1 },
            { id: 'valid', type: 'telemetry-snapshot', x: 11, y: 0, w: 1, h: 3 },
          ],
        },
      ],
    };
    const before = structuredClone(fixture);
    const store = sanitizeCustomPageStore(fixture);

    expect(fixture).toEqual(before);
    expect(store.version).toBe(2);
    expect(store.tabs.map(({ id, tabNumber, title }) => ({ id, tabNumber, title }))).toEqual([
      { id: 'first', tabNumber: 7, title: 'Tab 7' },
      { id: 'duplicate', tabNumber: 1, title: 'Original' },
      { id: 'partial', tabNumber: 2, title: 'Partial' },
    ]);
    expect(store.tabs[2].widgets).toEqual([
      { id: 'valid', type: 'telemetry-snapshot', x: 11, y: 0, w: 1, h: 3 },
    ]);
    expect(store.nextTabNumber).toBe(8);
  });

  it('accepts only native version 2 through the public sanitizer', () => {
    expect(sanitizeCustomPageStore({ version: 1, nextTabNumber: 9, tabs: [] }))
      .toEqual(createEmptyCustomPageStore());
    expect(sanitizeCustomPageStore({
      version: 2,
      nextTabNumber: 2,
      tabs: [
        { id: 'bad id', title: 'Bad ID', widgets: [] },
        { id: 'valid', title: 'Valid', widgets: [] },
      ],
    })).toEqual({
      version: 2,
      nextTabNumber: 2,
      tabs: [{ id: 'valid', tabNumber: 1, title: 'Valid', widgets: [] }],
    });
  });

  it('writes only the version-2 custom-pages key and swallows blocked writes', () => {
    const setItem = vi.fn();
    const store = createEmptyCustomPageStore();
    writeCustomPageStore({ setItem }, store);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(CUSTOM_PAGES_STORAGE_KEY, JSON.stringify(store));
    expect(setItem).not.toHaveBeenCalledWith(LEGACY_CUSTOM_PAGES_STORAGE_KEY, expect.anything());
    expect(() => writeCustomPageStore({
      setItem: () => { throw new Error('full'); },
    }, store)).not.toThrow();
  });

  it('persists native chart geometry and settings exactly', () => {
    const created = createCustomPage(createEmptyCustomPageStore(), {
      id: 'chart-page',
      widgets: [chartWidget],
    });
    const updated = updateCustomPageLayout(created.store, created.page.id, [chartWidget]);
    let persisted: string | null = null;
    const storage = {
      getItem: (key: string) => key === CUSTOM_PAGES_STORAGE_KEY ? persisted : null,
      setItem: (key: string, value: string) => {
        if (key === CUSTOM_PAGES_STORAGE_KEY) persisted = value;
      },
    };

    writeCustomPageStore(storage, updated);
    const restored = readCustomPageStore(storage);

    expect(restored).toEqual({ store: updated, migrated: false });
    expect(restored.store.tabs[0].widgets).toEqual([chartWidget]);
  });

  it('quantizes V3 exports and migrates both V2 and V3 imports', () => {
    const fineChart: DashboardPanelInstance = { ...chartWidget, x: 5, w: 2 };
    const page = createCustomPage(createEmptyCustomPageStore(), {
      id: 'chart-page',
      widgets: [fineChart],
    }).page;
    const document = buildCustomPageShareDocument('Charts', [page]);

    expect(document.profile.version).toBe(3);
    expect(document.profile.pages[0].widgets).toEqual([{
      ...fineChart,
      x: 1,
      w: 1,
    }]);
    const reimported = importSharedCustomPages(createEmptyCustomPageStore(), document.profile);
    expect(reimported.pages[0].widgets).toEqual([{
      ...fineChart,
      x: 4,
      w: 4,
    }]);

    const v2 = ShareProfileV2Schema.parse({
      version: 2,
      pages: [{ title: 'V2', widgets: legacySharedWidgets }],
    });
    const v3 = ShareProfileV3Schema.parse({
      version: 3,
      pages: [{
        title: 'V3',
        widgets: [{ ...chartWidget, x: 0, w: 3, h: 18 }],
      }],
    });
    expect(importSharedCustomPages(createEmptyCustomPageStore(), v2).pages[0].widgets)
      .toEqual([{ ...legacySharedWidgets[0], x: 4, w: 8 }]);
    expect(importSharedCustomPages(createEmptyCustomPageStore(), v3).pages[0].widgets)
      .toEqual([{ ...chartWidget, x: 0, w: 12, h: 18 }]);
  });

  it('imports an ordered legacy batch atomically with fresh IDs and version 2', () => {
    const first = createCustomPage(createEmptyCustomPageStore(), { id: 'one' });
    const before = structuredClone(first.store);
    const imported = importSharedCustomPages(first.store, {
      version: 2,
      pages: [
        { title: 'Shared page', widgets: legacySharedWidgets },
        { title: 'Empty page', widgets: [] },
      ],
    });

    expect(first.store).toEqual(before);
    expect(imported.pages.map(({ tabNumber, title, widgets }) => ({
      tabNumber,
      title,
      widgets,
    }))).toEqual([
      { tabNumber: 2, title: 'Shared page', widgets: [{ ...legacySharedWidgets[0], x: 4, w: 8 }] },
      { tabNumber: 3, title: 'Empty page', widgets: [] },
    ]);
    expect(new Set(imported.pages.map((page) => page.id)).size).toBe(2);
    expect(imported.store.version).toBe(2);
    expect(imported.store.nextTabNumber).toBe(first.store.nextTabNumber + 2);
  });

  it('clamps oversized shared widgets, floors height, and compacts collisions', () => {
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
      { id: 'wide', type: 'telemetry-snapshot', x: 0, y: 0, w: 12, h: 3 },
      { id: 'overlap', type: 'hero-popularity', x: 0, y: 3, w: 12, h: 3 },
    ]);
    expect(imported.store.tabs[0].widgets).toEqual(imported.pages[0].widgets);
  });

  it('keeps every mutation on store version 2', () => {
    const created = createCustomPage(createEmptyCustomPageStore(), { id: 'page' });
    const renamed = renameCustomPage(created.store, 'page', 'Renamed');
    const updated = updateCustomPageLayout(renamed, 'page', []);
    const removed = removeCustomPage(updated, 'page');

    expect([created.store.version, renamed.version, updated.version, removed.version])
      .toEqual([2, 2, 2, 2]);
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
