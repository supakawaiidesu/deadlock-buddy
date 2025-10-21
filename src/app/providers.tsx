'use client';

import {
  PersistQueryClientProvider,
  PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client';
import { QueryClient, QueryClientProvider, QueryClientConfig } from '@tanstack/react-query';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof Error && 'status' in error && (error as any).status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    },
  },
};

const PERSIST_MAX_AGE = 1000 * 60 * 30; // 30 minutes

function createPersister(): PersistQueryClientProviderProps['persistOptions']['persister'] | null {
  if (typeof window === 'undefined') return null;

  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'deadlock-buddy-query-cache',
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(QUERY_CONFIG));
  const [persister, setPersister] = useState<
    PersistQueryClientProviderProps['persistOptions']['persister'] | null
  >(null);

  useEffect(() => {
    setPersister(createPersister());
  }, []);

  const persistOptions = useMemo<PersistQueryClientProviderProps['persistOptions'] | null>(
    () =>
      persister
        ? {
            persister,
            maxAge: PERSIST_MAX_AGE,
            structuralSharing: true,
          }
        : null,
    [persister],
  );

  if (!persistOptions) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
