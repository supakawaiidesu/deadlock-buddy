import type { DashboardDataBundle } from '@/features/dashboard/dashboard-types';
import { DashboardLoadingPanel } from '@/features/dashboard/components/dashboard-loading-panel';
import {
  dashboardPanelRegistry,
  defaultDashboardLayout,
} from '@/features/dashboard/dashboard-panel-registry';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';

type DashboardLayoutProps =
  | {
      data: DashboardDataBundle;
      isLoading?: false;
    }
  | {
      data?: never;
      isLoading: true;
    };

const STORAGE_KEY = 'deadlock-buddy-dashboard-layout.v1';

export function DashboardLayout(props: DashboardLayoutProps) {
  const modeProps = props.isLoading
    ? {
        isLoading: true as const,
        renderLoading: (
          instance: (typeof defaultDashboardLayout)[number],
          headerActions: React.ReactNode,
        ) => (
          <DashboardLoadingPanel
            type={instance.type}
            title={dashboardPanelRegistry[instance.type].title}
            headerActions={headerActions}
          />
        ),
      }
    : { data: props.data };

  return (
    <WidgetGrid
      registry={dashboardPanelRegistry}
      defaultLayout={defaultDashboardLayout}
      storageKey={STORAGE_KEY}
      emptyStateTitle="Nothing on the dashboard yet."
      useGridHeightOnMobile
      {...modeProps}
    />
  );
}
