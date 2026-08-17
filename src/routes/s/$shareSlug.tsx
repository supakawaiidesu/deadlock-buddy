import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { ZodError } from 'zod';
import { useShare } from '@/features/custom-pages/api/queries';
import { useCustomPages } from '@/features/custom-pages/custom-pages-provider';
import { buildCustomPageNavigation } from '@/features/custom-pages/custom-page-state';
import { ApiError } from '@/lib/api/client';
import { GetShareResponseSchema } from '@/lib/api/schema';
import { parseSharePath } from '@/lib/api/shares';

export const Route = createFileRoute('/s/$shareSlug')({
  component: SharedCustomTabsRoute,
});

function RouteStatus({ children }: { children: string }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16 text-center text-sm text-[rgb(var(--text-rgb)/0.65)]">
      {children}
    </div>
  );
}

function SharedCustomTabsRoute() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const { importSharedPages } = useCustomPages();
  const shareId = parseSharePath(pathname);
  const shareQuery = useShare(shareId);
  const handledShareIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (
      shareId === null ||
      !shareQuery.isSuccess ||
      !shareQuery.isFetchedAfterMount ||
      shareQuery.fetchStatus !== 'idle' ||
      shareQuery.isRefetchError ||
      handledShareIdsRef.current.has(shareId)
    ) {
      return;
    }

    const validated = GetShareResponseSchema.safeParse(shareQuery.data);
    if (!validated.success) return;

    handledShareIdsRef.current.add(shareId);
    const importedPages = importSharedPages(validated.data.profile);
    const canonicalPath = validated.data.path;

    void (async () => {
      if (pathname !== canonicalPath) {
        await navigate({
          to: '/s/$shareSlug',
          params: { shareSlug: canonicalPath.slice('/s/'.length) },
          replace: true,
          resetScroll: false,
        });
      }
      await navigate(buildCustomPageNavigation(importedPages[0].tabNumber, true));
    })();
  }, [
    importSharedPages,
    navigate,
    pathname,
    shareId,
    shareQuery.data,
    shareQuery.fetchStatus,
    shareQuery.isFetchedAfterMount,
    shareQuery.isRefetchError,
    shareQuery.isSuccess,
  ]);

  if (shareId === null) {
    return <RouteStatus>This shared tab link is invalid or no longer available.</RouteStatus>;
  }

  const requiredFetchIsPending =
    !shareQuery.isFetchedAfterMount || shareQuery.fetchStatus !== 'idle';
  if (requiredFetchIsPending) {
    return <RouteStatus>Loading shared custom tabs…</RouteStatus>;
  }
  const validation = GetShareResponseSchema.safeParse(shareQuery.data);
  const error = shareQuery.error;
  if (
    error instanceof ZodError ||
    (error instanceof ApiError && (error.status === 400 || error.status === 404))
  ) {
    return <RouteStatus>This shared tab link is invalid or no longer available.</RouteStatus>;
  }
  if (error instanceof ApiError && error.status === 429) {
    return <RouteStatus>Too many share requests. Try again shortly.</RouteStatus>;
  }
  if (shareQuery.isError || shareQuery.isRefetchError) {
    return <RouteStatus>Unable to load this share right now. Try refreshing the page.</RouteStatus>;
  }
  if (!validation.success) {
    return <RouteStatus>This shared tab link is invalid or no longer available.</RouteStatus>;
  }

  return <RouteStatus>Loading shared custom tabs…</RouteStatus>;
}
