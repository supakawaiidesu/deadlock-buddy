import { dashboardPanelRegistry } from '@/features/dashboard/dashboard-panel-registry';
import type {
  DashboardPanelInstance,
  DashboardPanelType,
} from '@/features/dashboard/dashboard-types';
import {
  migrateThreeColumnWidgetLayout,
  quantizeTwelveColumnWidgetLayoutForShare,
  sanitizeWidgetLayout,
} from '@/features/widgets/widget-layout';
import type { ShareDocumentV3, ShareProfile } from '@/lib/api/schema';

export const CUSTOM_PAGES_STORAGE_KEY = 'deadlock-buddy-custom-pages.v2';
export const LEGACY_CUSTOM_PAGES_STORAGE_KEY = 'deadlock-buddy-custom-pages.v1';
export const MAX_CUSTOM_PAGE_TITLE_LENGTH = 40;

const MAX_CUSTOM_PAGE_WIDGETS = 64;
const MAX_CUSTOM_PAGE_WIDGET_ID_LENGTH = 128;
const MAX_CUSTOM_PAGE_WIDGET_HEIGHT = 1000;
const CUSTOM_PAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const GENERATED_TAB_TITLE_PATTERN = /^Tab (\d+)$/;
const CUSTOM_PAGE_TAB_NUMBER_PATTERN = /^[1-9]\d*$/;
const dashboardPanelTypes = new Set(Object.keys(dashboardPanelRegistry));

export type CustomPageTab = {
  id: string;
  tabNumber: number;
  title: string;
  widgets: DashboardPanelInstance[];
};

export type CustomPageStore = {
  version: 2;
  nextTabNumber: number;
  tabs: CustomPageTab[];
};

export type CustomPageStoreHydration = {
  store: CustomPageStore;
  migrated: boolean;
};


export type CustomPageNavigation = {
  to: '/tab/$tabNumber';
  params: { tabNumber: string };
  hash: '';
  replace: boolean;
  resetScroll: false;
  hashScrollIntoView: false;
};


export type CustomPageResolution =
  | { status: 'local'; page: CustomPageTab }
  | { status: 'missing' }
  | { status: 'invalid' };

export function createEmptyCustomPageStore(): CustomPageStore {
  return { version: 2, nextTabNumber: 1, tabs: [] };
}

function rebuildWidget(widget: DashboardPanelInstance): DashboardPanelInstance {
  return widget.type === 'hero-winrate-over-time'
    ? { ...widget, settings: { ...widget.settings, heroIds: [...widget.settings.heroIds] } }
    : { ...widget };
}

function sanitizeStoredWidgets(raw: unknown): DashboardPanelInstance[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_CUSTOM_PAGE_WIDGETS) return null;
  if (raw.length === 0) return [];

  const candidates = raw.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      candidate.id.length > MAX_CUSTOM_PAGE_WIDGET_ID_LENGTH ||
      typeof candidate.type !== 'string' ||
      !dashboardPanelTypes.has(candidate.type)
    ) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  return sanitizeWidgetLayout<DashboardPanelType, DashboardPanelInstance>(
    candidates,
    dashboardPanelRegistry,
  );
}

function sanitizeSharedWidgets(raw: unknown): DashboardPanelInstance[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_CUSTOM_PAGE_WIDGETS) return null;
  if (raw.length === 0) return [];

  const candidates = raw.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      candidate.id.length > MAX_CUSTOM_PAGE_WIDGET_ID_LENGTH ||
      typeof candidate.type !== 'string' ||
      !dashboardPanelTypes.has(candidate.type)
    ) {
      return false;
    }

    const geometry = [candidate.x, candidate.y, candidate.w, candidate.h];
    return (
      geometry.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
      (candidate.h as number) <= MAX_CUSTOM_PAGE_WIDGET_HEIGHT
    );
  });

  if (candidates.length === 0) return null;
  return sanitizeWidgetLayout<DashboardPanelType, DashboardPanelInstance>(
    candidates,
    dashboardPanelRegistry,
  );
}
function clonePage(page: CustomPageTab): CustomPageTab {
  return {
    id: page.id,
    tabNumber: page.tabNumber,
    title: page.title,
    widgets: page.widgets.map(rebuildWidget),
  };
}

function generatedTabNumber(title: string): number | null {
  const match = GENERATED_TAB_TITLE_PATTERN.exec(title);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function nextAvailableTabNumber(seen: ReadonlySet<number>): number {
  let value = 1;
  while (seen.has(value)) value += 1;
  return value;
}

function parseCustomPageStore(raw: unknown, version: 1 | 2): CustomPageStore | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== version || !Array.isArray(candidate.tabs)) return null;

  const tabs: CustomPageTab[] = [];
  const seenIds = new Set<string>();
  const seenTabNumbers = new Set<number>();

  for (const rawTab of candidate.tabs) {
    if (!rawTab || typeof rawTab !== 'object') continue;
    const tab = rawTab as Record<string, unknown>;
    if (
      typeof tab.id !== 'string' ||
      !isValidCustomPageId(tab.id) ||
      seenIds.has(tab.id) ||
      typeof tab.title !== 'string'
    ) {
      continue;
    }

    const title = tab.title.trim();
    if (!title || Array.from(title).length > MAX_CUSTOM_PAGE_TITLE_LENGTH) continue;
    const widgets = sanitizeStoredWidgets(
      version === 1 ? migrateThreeColumnWidgetLayout(tab.widgets) : tab.widgets,
    );
    if (widgets === null) continue;

    const storedTabNumber =
      typeof tab.tabNumber === 'number' &&
      Number.isSafeInteger(tab.tabNumber) &&
      tab.tabNumber >= 1
        ? tab.tabNumber
        : null;
    const preferredTabNumber = storedTabNumber ?? generatedTabNumber(title);
    const tabNumber =
      preferredTabNumber !== null && !seenTabNumbers.has(preferredTabNumber)
        ? preferredTabNumber
        : nextAvailableTabNumber(seenTabNumbers);

    seenIds.add(tab.id);
    seenTabNumbers.add(tabNumber);
    tabs.push({
      id: tab.id,
      tabNumber,
      title,
      widgets: widgets.map(rebuildWidget),
    });
  }

  const storedNextTabNumber =
    typeof candidate.nextTabNumber === 'number' &&
    Number.isSafeInteger(candidate.nextTabNumber) &&
    candidate.nextTabNumber >= 1
      ? candidate.nextTabNumber
      : 1;
  const highestTabNumber = tabs.reduce(
    (highest, tab) => Math.max(highest, tab.tabNumber),
    0,
  );
  const nextTabNumber = Math.max(storedNextTabNumber, highestTabNumber + 1);

  return { version: 2, nextTabNumber, tabs };
}

export function sanitizeCustomPageStore(raw: unknown): CustomPageStore {
  return parseCustomPageStore(raw, 2) ?? createEmptyCustomPageStore();
}

export function readCustomPageStore(
  storage: Pick<Storage, 'getItem'>,
): CustomPageStoreHydration {
  const read = (key: string): unknown | undefined => {
    try {
      const stored = storage.getItem(key);
      return stored === null ? undefined : JSON.parse(stored) as unknown;
    } catch {
      return undefined;
    }
  };

  const current = parseCustomPageStore(read(CUSTOM_PAGES_STORAGE_KEY), 2);
  if (current) return { store: current, migrated: false };

  const legacy = parseCustomPageStore(read(LEGACY_CUSTOM_PAGES_STORAGE_KEY), 1);
  if (legacy) return { store: legacy, migrated: true };

  return { store: createEmptyCustomPageStore(), migrated: false };
}

export function writeCustomPageStore(
  storage: Pick<Storage, 'setItem'>,
  store: CustomPageStore,
): void {
  try {
    storage.setItem(
      CUSTOM_PAGES_STORAGE_KEY,
      JSON.stringify(sanitizeCustomPageStore(store)),
    );
  } catch {
    // Storage can be unavailable or full; provider state remains authoritative in-session.
  }
}

export function createCustomPageId(): string {
  return crypto.randomUUID();
}

export function isValidCustomPageId(value: string): boolean {
  return CUSTOM_PAGE_ID_PATTERN.test(value);
}

export function normalizeCustomPageTitle(value: string, fallback: string): string {
  const normalized = Array.from(value.trim())
    .slice(0, MAX_CUSTOM_PAGE_TITLE_LENGTH)
    .join('');
  return normalized || fallback;
}

function normalizeInputWidgets(
  widgets: readonly DashboardPanelInstance[] | undefined,
): DashboardPanelInstance[] {
  if (!widgets) return [];
  const sanitized = sanitizeSharedWidgets(widgets);
  return (sanitized ?? []).map(rebuildWidget);
}

export function createCustomPage(
  store: CustomPageStore,
  input: {
    id?: string;
    title?: string;
    widgets?: DashboardPanelInstance[];
  } = {},
): { store: CustomPageStore; page: CustomPageTab } {
  const id = input.id && isValidCustomPageId(input.id) ? input.id : createCustomPageId();
  const tabNumber = store.nextTabNumber;
  const fallbackTitle = `Tab ${tabNumber}`;
  const page: CustomPageTab = {
    id,
    tabNumber,
    title:
      input.title === undefined
        ? fallbackTitle
        : normalizeCustomPageTitle(input.title, fallbackTitle),
    widgets: normalizeInputWidgets(input.widgets),
  };
  return {
    store: {
      version: 2,
      nextTabNumber: tabNumber + 1,
      tabs: [...store.tabs.map(clonePage), page],
    },
    page,
  };
}

export function importSharedCustomPages(
  store: CustomPageStore,
  shared: ShareProfile,
): { store: CustomPageStore; pages: CustomPageTab[] } {
  const pages = shared.pages.map((sharedPage, index): CustomPageTab => {
    const tabNumber = store.nextTabNumber + index;
    return {
      id: createCustomPageId(),
      tabNumber,
      title: normalizeCustomPageTitle(sharedPage.title, `Tab ${tabNumber}`),
      widgets: normalizeInputWidgets(
        migrateThreeColumnWidgetLayout(sharedPage.widgets) as DashboardPanelInstance[],
      ),
    };
  });
  return {
    store: {
      version: 2,
      nextTabNumber: store.nextTabNumber + pages.length,
      tabs: [...store.tabs.map(clonePage), ...pages],
    },
    pages,
  };
}

export function buildCustomPageShareDocument(
  name: string,
  pages: readonly CustomPageTab[],
): ShareDocumentV3 {
  return {
    name,
    profile: {
      version: 3,
      pages: pages.map((page) => ({
        title: page.title,
        widgets: (quantizeTwelveColumnWidgetLayoutForShare(
          page.widgets,
        ) as DashboardPanelInstance[]).map((widget) => widget.type === 'hero-winrate-over-time'
          ? {
              id: widget.id,
              type: widget.type,
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
              settings: {
                ...widget.settings,
                heroIds: [...widget.settings.heroIds],
              },
            }
          : {
              id: widget.id,
              type: widget.type,
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
            }),
      })),
    },
  };
}

export function renameCustomPage(
  store: CustomPageStore,
  pageId: string,
  title: string,
): CustomPageStore {
  return {
    version: 2,
    nextTabNumber: store.nextTabNumber,
    tabs: store.tabs.map((tab) =>
      tab.id === pageId
        ? { ...clonePage(tab), title: normalizeCustomPageTitle(title, tab.title) }
        : clonePage(tab),
    ),
  };
}

export function updateCustomPageLayout(
  store: CustomPageStore,
  pageId: string,
  widgets: DashboardPanelInstance[],
): CustomPageStore {
  const nextWidgets = normalizeInputWidgets(widgets);
  return {
    version: 2,
    nextTabNumber: store.nextTabNumber,
    tabs: store.tabs.map((tab) =>
      tab.id === pageId ? { ...clonePage(tab), widgets: nextWidgets } : clonePage(tab),
    ),
  };
}

export function removeCustomPage(
  store: CustomPageStore,
  pageId: string,
): CustomPageStore {
  return {
    version: 2,
    nextTabNumber: store.nextTabNumber,
    tabs: store.tabs.filter((tab) => tab.id !== pageId).map(clonePage),
  };
}

export function getCustomPageCloseDestination(
  tabs: readonly CustomPageTab[],
  pageId: string,
): CustomPageTab | null {
  const index = tabs.findIndex((tab) => tab.id === pageId);
  if (index === -1) return null;
  return tabs[index + 1] ?? tabs[index - 1] ?? null;
}


export function resolveCustomPage(
  tabNumberParam: string,
  store: CustomPageStore,
): CustomPageResolution {
  if (!CUSTOM_PAGE_TAB_NUMBER_PATTERN.test(tabNumberParam)) {
    return { status: 'invalid' };
  }

  const tabNumber = Number(tabNumberParam);
  if (!Number.isSafeInteger(tabNumber)) return { status: 'invalid' };
  const localPage = store.tabs.find((tab) => tab.tabNumber === tabNumber);
  return localPage
    ? { status: 'local', page: clonePage(localPage) }
    : { status: 'missing' };
}

export function buildCustomPageNavigation(
  tabNumber: number,
  replace: boolean,
): CustomPageNavigation {
  return {
    to: '/tab/$tabNumber',
    params: { tabNumber: String(tabNumber) },
    hash: '',
    replace,
    resetScroll: false,
    hashScrollIntoView: false,
  };
}

