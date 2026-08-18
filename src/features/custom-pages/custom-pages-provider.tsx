import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DashboardPanelInstance } from '@/features/dashboard/dashboard-types';
import type { ShareProfile } from '@/lib/api/schema';
import {
  createCustomPage,
  importSharedCustomPages,
  readCustomPageStore,
  removeCustomPage,
  renameCustomPage,
  resolveCustomPage,
  updateCustomPageLayout,
  writeCustomPageStore,
  type CustomPageStore,
  type CustomPageStoreHydration,
  type CustomPageResolution,
  type CustomPageTab,
} from '@/features/custom-pages/custom-page-state';

export type CustomPagesContextValue = {
  tabs: readonly CustomPageTab[];
  resolvePage: (tabNumberParam: string) => CustomPageResolution;
  createPage: () => CustomPageTab;
  importSharedPages: (shared: ShareProfile) => CustomPageTab[];
  resolvePages: (pageIds: readonly string[]) => CustomPageTab[];
  renamePage: (pageId: string, title: string) => CustomPageTab | undefined;
  updatePageLayout: (pageId: string, widgets: DashboardPanelInstance[]) => void;
  removePage: (pageId: string) => void;
};

const CustomPagesContext = createContext<CustomPagesContextValue | null>(null);

export function CustomPagesProvider({ children }: { children: ReactNode }) {
  const hydrationRef = useRef<CustomPageStoreHydration | null>(null);
  const [store, setStore] = useState(() => {
    const hydration = readCustomPageStore(window.localStorage);
    hydrationRef.current = hydration;
    return hydration.store;
  });
  const storeRef = useRef<CustomPageStore>(store);
  const commitStore = useCallback((next: CustomPageStore) => {
    storeRef.current = next;
    writeCustomPageStore(window.localStorage, next);
    setStore(next);
  }, []);

  useEffect(() => {
    if (!hydrationRef.current?.migrated) return;
    hydrationRef.current = { ...hydrationRef.current, migrated: false };
    writeCustomPageStore(window.localStorage, storeRef.current);
  }, []);

  const resolvePage = useCallback(
    (tabNumberParam: string) => resolveCustomPage(tabNumberParam, storeRef.current),
    [],
  );

  const createPage = useCallback(() => {
    const created = createCustomPage(storeRef.current);
    commitStore(created.store);
    return created.page;
  }, [commitStore]);

  const importSharedPages = useCallback((shared: ShareProfile) => {
    const imported = importSharedCustomPages(storeRef.current, shared);
    commitStore(imported.store);
    return imported.pages;
  }, [commitStore]);

  const resolvePages = useCallback((pageIds: readonly string[]) => {
    const requestedIds = new Set(pageIds);
    return storeRef.current.tabs
      .filter((tab) => requestedIds.has(tab.id))
      .map((tab) => ({ ...tab, widgets: tab.widgets.map((widget) => ({ ...widget })) }));
  }, []);

  const renamePage = useCallback((pageId: string, title: string) => {
    if (!storeRef.current.tabs.some((tab) => tab.id === pageId)) return undefined;
    const next = renameCustomPage(storeRef.current, pageId, title);
    commitStore(next);
    return next.tabs.find((tab) => tab.id === pageId);
  }, [commitStore]);

  const updatePageLayout = useCallback((
    pageId: string,
    widgets: DashboardPanelInstance[],
  ) => {
    if (!storeRef.current.tabs.some((tab) => tab.id === pageId)) return;
    commitStore(updateCustomPageLayout(storeRef.current, pageId, widgets));
  }, [commitStore]);

  const removePage = useCallback((pageId: string) => {
    if (!storeRef.current.tabs.some((tab) => tab.id === pageId)) return;
    commitStore(removeCustomPage(storeRef.current, pageId));
  }, [commitStore]);

  const value = useMemo<CustomPagesContextValue>(() => ({
    tabs: store.tabs,
    resolvePage,
    createPage,
    importSharedPages,
    resolvePages,
    renamePage,
    updatePageLayout,
    removePage,
  }), [
    createPage,
    importSharedPages,
    resolvePages,
    removePage,
    renamePage,
    resolvePage,
    store.tabs,
    updatePageLayout,
  ]);

  return (
    <CustomPagesContext.Provider value={value}>
      {children}
    </CustomPagesContext.Provider>
  );
}

export function useCustomPages(): CustomPagesContextValue {
  const context = useContext(CustomPagesContext);
  if (!context) {
    throw new Error('useCustomPages must be used within CustomPagesProvider');
  }
  return context;
}
