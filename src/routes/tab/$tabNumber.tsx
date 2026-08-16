import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useCustomPages } from '@/features/custom-pages/custom-pages-provider';
import type { CustomPageTab } from '@/features/custom-pages/custom-page-state';
import { useDashboardData } from '@/features/dashboard/api/queries';
import { DashboardLayout } from '@/features/dashboard/components/dashboard-layout';

export const Route = createFileRoute('/tab/$tabNumber')({
  component: CustomTabRoute,
});

function CustomTabRoute() {
  const { tabNumber } = Route.useParams();
  const { resolvePage, updatePageLayout } = useCustomPages();
  const resolution = resolvePage(tabNumber);
  const page = resolution.status === 'local' ? resolution.page : undefined;
  const { data } = useDashboardData({
    enabled: (page?.widgets.length ?? 0) > 0,
  });
  const handleLayoutCommit = useCallback(
    (widgets: CustomPageTab['widgets']) => {
      if (page) updatePageLayout(page.id, widgets);
    },
    [page?.id, updatePageLayout],
  );

  if (!page) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16 text-center text-sm text-[rgb(var(--text-rgb)/0.65)]">
        This custom tab does not exist.
      </div>
    );
  }


  const modeProps = data ? { data } : { isLoading: true as const };

  return (
    <div className="flex min-h-full flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      <DashboardLayout
        key={page.id}
        initialLayout={page.widgets}
        onLayoutCommit={handleLayoutCommit}
        emptyStateTitle="Spawn a widget to create a custom page."
        emptyStateHint={null}
        {...modeProps}
      />
    </div>
  );
}
