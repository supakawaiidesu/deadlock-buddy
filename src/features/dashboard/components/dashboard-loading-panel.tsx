import { Filter } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DashboardPanelType } from '@/features/dashboard/dashboard-types';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

type DashboardLoadingPanelProps = {
  type: DashboardPanelType;
  title: string;
  headerActions?: ReactNode;
};

const TELEMETRY_LABELS = [
  'Leaderboard sample',
  'Hero roster tracked',
  'Highest badge · sample',
  'Top winrate · sample',
  'Data refresh',
] as const;

const LOADING_ROW_IDS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

export function DashboardLoadingPanel({
  type,
  title,
  headerActions,
}: DashboardLoadingPanelProps) {
  const status = (
    <span className="sr-only" role="status">
      Loading dashboard data…
    </span>
  );

  if (type === 'telemetry-snapshot') {
    return (
      <Panel className="flex h-full flex-col gap-[4px] !p-0" aria-busy="true">
        {status}
        <div className="panel-header">
          <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            {title}
          </h2>
          <div className="panel-header-actions">{headerActions}</div>
        </div>
        <ul className="flex flex-1 flex-col gap-[6px] px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.65)]">
          {TELEMETRY_LABELS.map((label, index) => (
            <li
              key={label}
              className={
                index < 2
                  ? 'flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2 leading-tight'
                  : 'flex items-center justify-between leading-tight'
              }
            >
              <span>{label}</span>
              <Skeleton className="h-3 w-14" />
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  if (type === 'rank-distribution') {
    return (
      <Panel className="flex h-full flex-col gap-[4px] !p-0" aria-busy="true">
        {status}
        <div className="panel-header">
          <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            {title}
          </h2>
          <div className="panel-header-actions">
            <span className="panel-header-meta">
              <Skeleton className="h-3 w-16" />
            </span>
            <span className="panel-header-meta">
              <Skeleton className="h-3 w-20" />
            </span>
            <button
              type="button"
              disabled
              className="panel-header-action"
              aria-label="Filters unavailable while loading"
              title="Filters unavailable while loading"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
            </button>
            {headerActions}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-0">
          <Skeleton className="min-h-[180px] w-full flex-1" />
        </div>
      </Panel>
    );
  }

  if (type === 'na-leaderboard') {
    return (
      <Panel className="flex h-full flex-col gap-[4px] !p-0" aria-busy="true">
        {status}
        <div className="panel-header">
          <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            {title}
          </h2>
          <div className="panel-header-actions">
            <span className="panel-header-meta">
              Top <Skeleton className="inline-block h-3 w-4" />
            </span>
            {headerActions}
          </div>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 scroll-quiet">
          {LOADING_ROW_IDS.map((rowId) => (
            <li
              key={rowId}
              className="flex items-center justify-between border-b border-[rgb(var(--text-rgb)/0.12)] px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-5" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  return (
    <Panel className="flex h-full flex-col gap-[4px] !p-0" aria-busy="true">
      {status}
      <div className="panel-header">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            {title}
          </h2>
        </div>
        <div className="panel-header-actions">
          <button
            type="button"
            disabled
            className="panel-header-action"
            aria-label="Filters unavailable while loading"
            title="Filters unavailable while loading"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
          {headerActions}
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 scroll-quiet">
          {LOADING_ROW_IDS.map((rowId) => (
            <li
              key={rowId}
              className="flex items-center justify-between border-b border-[rgb(var(--text-rgb)/0.12)] px-4 py-3 text-xs"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-3 w-5 shrink-0" />
                <Skeleton className="h-7 w-7 shrink-0" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
