import {
  PersistQueryClientProvider,
  PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client';
import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof Error && hasStatusCode(error) && error.status === 404) {
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

function hasStatusCode(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'deadlock-buddy-query-cache',
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(QUERY_CONFIG));

  const persistOptions = useMemo<PersistQueryClientProviderProps['persistOptions']>(
    () => ({
      persister,
      maxAge: PERSIST_MAX_AGE,
      structuralSharing: true,
    }),
    [],
  );

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
