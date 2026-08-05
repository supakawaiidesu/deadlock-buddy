import type { DashboardDataBundle } from '@/features/dashboard/dashboard-types';
import {
  dashboardPanelRegistry,
  defaultDashboardLayout,
} from '@/features/dashboard/dashboard-panel-registry';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';

type DashboardLayoutProps = {
  data: DashboardDataBundle;
};

const STORAGE_KEY = 'deadlock-buddy-dashboard-layout.v1';

export function DashboardLayout({ data }: DashboardLayoutProps) {
  return (
    <WidgetGrid
      registry={dashboardPanelRegistry}
      defaultLayout={defaultDashboardLayout}
      data={data}
      storageKey={STORAGE_KEY}
      emptyStateTitle="Nothing on the dashboard yet."
    />
  );
}
