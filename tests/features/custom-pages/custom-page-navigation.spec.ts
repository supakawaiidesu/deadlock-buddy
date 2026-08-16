import { describe, expect, it } from 'vitest';
import {
  buildCustomPageNavigation,
  buildCustomPageShareUrl,
  createEmptyCustomPageStore,
  decodeCustomPageHash,
  encodeCustomPageHash,
  importSharedCustomPage,
  resolveCustomPage,
  type CustomPageStore,
  type CustomPageTab,
} from '@/features/custom-pages/custom-page-state';

const localPage: CustomPageTab = {
  id: 'page-1',
  tabNumber: 1,
  title: 'Local',
  widgets: [
    { id: 'local-widget', type: 'telemetry-snapshot', x: 0, y: 0, w: 1, h: 9 },
  ],
};
const store: CustomPageStore = {
  version: 1,
  nextTabNumber: 2,
  tabs: [localPage],
};

describe('custom page navigation', () => {
  it('resolves local tabs only by their local monotonic number', () => {
    expect(resolveCustomPage('1', store)).toEqual({
      status: 'local',
      page: localPage,
    });
    expect(resolveCustomPage('2', store)).toEqual({ status: 'missing' });
    expect(resolveCustomPage('page-1', store)).toEqual({ status: 'invalid' });
    expect(resolveCustomPage('01', store)).toEqual({ status: 'invalid' });
  });

  it('builds the same short destination for distinct committed layouts', () => {
    const secondPage: CustomPageTab = {
      ...localPage,
      widgets: [
        { id: 'other', type: 'hero-winrate', x: 0, y: 0, w: 1, h: 13 },
      ],
    };
    const first = buildCustomPageNavigation(localPage.tabNumber, true);
    const second = buildCustomPageNavigation(secondPage.tabNumber, true);

    expect(first).toEqual({
      to: '/tab/$tabNumber',
      params: { tabNumber: '1' },
      hash: '',
      replace: true,
      resetScroll: false,
      hashScrollIntoView: false,
    });
    expect(second).toEqual(first);
  });

  it('uses push navigation for a new local tab', () => {
    expect(buildCustomPageNavigation(localPage.tabNumber, false).replace).toBe(false);
  });

  it('imports every valid share as the recipient’s next local tab', () => {
    const hash = encodeCustomPageHash({
      version: 1,
      title: 'Shared',
      widgets: [
        { id: 'shared-widget', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
      ],
    });
    const decoded = decodeCustomPageHash(hash);
    if (!decoded.ok) throw new Error('Expected valid shared page hash');

    const imported = importSharedCustomPage(store, decoded.value);

    expect(imported.page).toMatchObject({
      tabNumber: 2,
      title: 'Shared',
      widgets: [{ id: 'shared-widget', type: 'rank-distribution' }],
    });
    expect(imported.page.id).not.toBe(localPage.id);
    expect(imported.store.nextTabNumber).toBe(3);
    expect(imported.store.tabs[0]).toEqual(localPage);
  });

  it('keeps a valid shared empty layout when importing', () => {
    const decoded = decodeCustomPageHash(
      encodeCustomPageHash({ version: 1, title: 'Empty', widgets: [] }),
    );
    if (!decoded.ok) throw new Error('Expected valid shared page hash');

    expect(importSharedCustomPage(store, decoded.value).page).toMatchObject({
      tabNumber: 2,
      title: 'Empty',
      widgets: [],
    });
  });

  it('rejects malformed and unsupported shared hashes', () => {
    expect(decodeCustomPageHash('v1.bad*')).toEqual({ ok: false });
    expect(decodeCustomPageHash('v2.abc')).toEqual({ ok: false });
  });

  it('builds a decodable share URL on the identity-free import route', () => {
    const page: CustomPageTab = {
      id: 'page-1',
      tabNumber: 1,
      title: '戦績 😀',
      widgets: [
        { id: 'shared-widget', type: 'rank-distribution', x: 0, y: 0, w: 2, h: 10 },
      ],
    };

    const shareUrl = buildCustomPageShareUrl(
      page,
      'https://example.test/tab/1',
    );
    const parsed = new URL(shareUrl);
    const decoded = decodeCustomPageHash(parsed.hash.slice(1));

    expect(parsed.pathname).toBe('/tab');
    expect(parsed.hash).toMatch(/^#v1\./);
    expect(decoded).toMatchObject({
      ok: true,
      value: { version: 1, title: page.title, widgets: page.widgets },
    });
  });

  it('preserves a deployment prefix and query while replacing an old fragment', () => {
    const shareUrl = buildCustomPageShareUrl(
      localPage,
      'https://example.test/deploy/tab/1?view=grid#old-fragment',
    );
    const parsed = new URL(shareUrl);

    expect(`${parsed.pathname}${parsed.search}`).toBe('/deploy/tab?view=grid');
    expect(parsed.hash).toMatch(/^#v1\./);
    expect(parsed.hash).not.toContain('old-fragment');
  });

  it('starts imports at Tab 1 for a recipient with empty storage', () => {
    const decoded = decodeCustomPageHash(
      encodeCustomPageHash({ version: 1, title: 'Sender title', widgets: [] }),
    );
    if (!decoded.ok) throw new Error('Expected valid shared page hash');

    const imported = importSharedCustomPage(createEmptyCustomPageStore(), decoded.value);

    expect(imported.page.tabNumber).toBe(1);
    expect(buildCustomPageNavigation(imported.page.tabNumber, true).params).toEqual({
      tabNumber: '1',
    });
  });
});
