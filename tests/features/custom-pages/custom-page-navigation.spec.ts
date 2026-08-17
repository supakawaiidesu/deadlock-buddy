import { describe, expect, it } from 'vitest';
import {
  buildCustomPageNavigation,
  buildCustomPageShareDocument,
  createEmptyCustomPageStore,
  importSharedCustomPages,
  resolveCustomPage,
  type CustomPageStore,
  type CustomPageTab,
} from '@/features/custom-pages/custom-page-state';

const localPage: CustomPageTab = {
  id: 'page-1',
  tabNumber: 1,
  title: 'Local',
  widgets: [{ id: 'local-widget', type: 'telemetry-snapshot', x: 0, y: 0, w: 1, h: 9 }],
};
const store: CustomPageStore = { version: 1, nextTabNumber: 2, tabs: [localPage] };
const selectedPages: CustomPageTab[] = [
  { id: 'page-3', tabNumber: 3, title: 'Third', widgets: [] },
  {
    id: 'page-1', tabNumber: 1, title: 'First',
    widgets: [{ id: 'shared-widget', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 }],
  },
];

describe('custom page navigation', () => {
  it('resolves local tabs only by their local monotonic number', () => {
    expect(resolveCustomPage('1', store)).toEqual({ status: 'local', page: localPage });
    expect(resolveCustomPage('2', store)).toEqual({ status: 'missing' });
    expect(resolveCustomPage('page-1', store)).toEqual({ status: 'invalid' });
    expect(resolveCustomPage('01', store)).toEqual({ status: 'invalid' });
  });

  it('builds short push and replace destinations', () => {
    expect(buildCustomPageNavigation(1, true)).toEqual({
      to: '/tab/$tabNumber', params: { tabNumber: '1' }, hash: '', replace: true,
      resetScroll: false, hashScrollIntoView: false,
    });
    expect(buildCustomPageNavigation(1, false).replace).toBe(false);
  });

  it('builds a v2 document in the supplied tab-bar order without local page metadata', () => {
    expect(buildCustomPageShareDocument('Selected tabs', selectedPages)).toEqual({
      name: 'Selected tabs',
      profile: {
        version: 2,
        pages: selectedPages.map(({ title, widgets }) => ({ title, widgets })),
      },
    });
  });

  it('appends the ordered subset and lands on the first imported page', () => {
    const document = buildCustomPageShareDocument('Selected tabs', selectedPages);
    const imported = importSharedCustomPages(store, document.profile);

    expect(imported.store.tabs.slice(1).map((page) => page.title)).toEqual(['Third', 'First']);
    expect(imported.pages.map((page) => page.tabNumber)).toEqual([2, 3]);
    expect(imported.pages.every((page) => !selectedPages.some((sender) => sender.id === page.id))).toBe(true);
    expect(imported.store.nextTabNumber).toBe(4);
    expect(buildCustomPageNavigation(imported.pages[0].tabNumber, true).params).toEqual({ tabNumber: '2' });
  });


  it('starts a batch at Tab 1 for a recipient with empty storage', () => {
    const document = buildCustomPageShareDocument('Selected tabs', selectedPages);
    const imported = importSharedCustomPages(createEmptyCustomPageStore(), document.profile);

    expect(imported.pages.map((page) => page.tabNumber)).toEqual([1, 2]);
    expect(buildCustomPageNavigation(imported.pages[0].tabNumber, true).params).toEqual({ tabNumber: '1' });
  });

});
