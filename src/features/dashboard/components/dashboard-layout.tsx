import type {
  DashboardDataBundle,
  DashboardPanelInstance,
} from '@/features/dashboard/dashboard-types';
import { DashboardLoadingPanel } from '@/features/dashboard/components/dashboard-loading-panel';
import {
  dashboardPanelRegistry,
  defaultDashboardLayout,
} from '@/features/dashboard/dashboard-panel-registry';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';

type DashboardLayoutDataProps =
  | {
      data: DashboardDataBundle;
      isLoading?: false;
    }
  | {
      data?: never;
      isLoading: true;
    };

type DashboardLayoutOwnerProps =
  | {
      initialLayout?: never;
      onLayoutCommit?: never;
      emptyStateTitle?: never;
      emptyStateHint?: never;
    }
  | {
      initialLayout: readonly DashboardPanelInstance[];
      onLayoutCommit: (next: DashboardPanelInstance[]) => void;
      emptyStateTitle: string;
      emptyStateHint?: string | null;
    };

type DashboardLayoutProps = DashboardLayoutDataProps & DashboardLayoutOwnerProps;

const DASHBOARD_STORAGE_KEY = 'deadlock-buddy-dashboard-layout.v2';
const LEGACY_DASHBOARD_STORAGE_KEY = 'deadlock-buddy-dashboard-layout.v1';

export function DashboardLayout(props: DashboardLayoutProps) {
  const modeProps = props.isLoading
    ? {
        isLoading: true as const,
        renderLoading: (
          instance: (typeof defaultDashboardLayout)[number],
          headerActions: React.ReactNode,
          size: WidgetRenderSize,
        ) => (
          <DashboardLoadingPanel
            type={instance.type}
            title={dashboardPanelRegistry[instance.type].title}
            headerActions={headerActions}
            size={size}
          />
        ),
      }
    : { data: props.data };

  const ownerProps =
    props.initialLayout === undefined
      ? {
          defaultLayout: defaultDashboardLayout,
          storageKey: DASHBOARD_STORAGE_KEY,
          legacyThreeColumnStorageKey: LEGACY_DASHBOARD_STORAGE_KEY,
        }
      : {
          initialLayout: props.initialLayout,
          onLayoutCommit: props.onLayoutCommit,
        };

  return (
    <WidgetGrid
      registry={dashboardPanelRegistry}
      emptyStateTitle={props.emptyStateTitle ?? 'Nothing on the dashboard yet.'}
      emptyStateHint={props.emptyStateHint}
      useGridHeightOnMobile
      {...ownerProps}
      {...modeProps}
    />
  );
}
