import { useMemo, useState, type ReactNode } from 'react';
import type { HeroOverviewRow } from '@/features/heroes/lib/overview';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

type SortKey = 'winrate' | 'pickRate' | 'matches' | 'players';

type SortDirection = 'asc' | 'desc';

type HeroOverviewPanelProps = {
  rows: readonly HeroOverviewRow[];
  isLoading?: boolean;
  headerActions?: ReactNode;
};

function formatPercent(value?: number): string {
  if (typeof value !== 'number') return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value?: number): string {
  if (typeof value !== 'number') return '\u2014';
  return value.toLocaleString();
}

function getMetricValue(row: HeroOverviewRow, key: SortKey): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  return Number.NEGATIVE_INFINITY;
}
const LOADING_ROW_IDS = Array.from({ length: 12 }, (_, index) => `hero-loading-${index}`);

function HeroOverviewRowSkeleton() {
  return (
    <tr className="border-t border-[rgb(var(--text-rgb)/0.08)]">
      <td className="px-4 py-3">
        <Skeleton className="h-3 w-6" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-sm" />
          <Skeleton className="h-3 w-24" />
        </div>
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-6 w-6 rounded-sm" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="ml-auto h-3 w-12" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="ml-auto h-3 w-14" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="ml-auto h-3 w-14" />
      </td>
    </tr>
  );
}

export function HeroOverviewPanel({
  rows,
  isLoading = false,
  headerActions,
}: HeroOverviewPanelProps) {
  const [sortState, setSortState] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'winrate',
    direction: 'desc',
  });

  const sortedRows = useMemo(() => {
    const cloned = [...rows];
    const { key, direction } = sortState;

    cloned.sort((a, b) => {
      const metricA = getMetricValue(a, key);
      const metricB = getMetricValue(b, key);

      if (metricA !== metricB) {
        return direction === 'desc' ? metricB - metricA : metricA - metricB;
      }

      const secondaryA = typeof a.winrate === 'number' ? a.winrate : Number.NEGATIVE_INFINITY;
      const secondaryB = typeof b.winrate === 'number' ? b.winrate : Number.NEGATIVE_INFINITY;

      if (secondaryA !== secondaryB) {
        return secondaryB - secondaryA;
      }

      return a.name.localeCompare(b.name);
    });

    return cloned;
  }, [rows, sortState]);

  const handleSortToggle = (key: SortKey) => {
    setSortState((current) => {
      if (current.key === key) {
        const nextDirection = current.direction === 'desc' ? 'asc' : 'desc';
        return { key, direction: nextDirection };
      }
      return { key, direction: 'desc' };
    });
  };

  const renderSortIndicator = (key: SortKey) => {
    const isActive = sortState.key === key;
    const baseTriClass = 'text-[8px] leading-none';
    const inactiveColor = 'text-[rgb(var(--text-rgb)/0.35)]';
    const activeColor = 'text-[var(--accent)]';

    const upColor = isActive && sortState.direction === 'asc' ? activeColor : inactiveColor;
    const downColor = isActive && sortState.direction === 'desc' ? activeColor : inactiveColor;

    return (
      <span className="flex flex-col items-center justify-center leading-none text-[8px]">
        <span className={`${baseTriClass} ${upColor} -mb-[1px]`}>{'\u25B2'}</span>
        <span className={`${baseTriClass} ${downColor}`}>{'\u25BC'}</span>
      </span>
    );
  };

  return (

    <Panel className="flex h-full min-w-0 flex-col gap-0 !p-0" aria-busy={isLoading}>
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          Hero overview
        </h2>
        <div className="panel-header-actions shrink-0">
          <span className="panel-header-meta">{isLoading ? 'Loading' : `${rows.length} heroes`}</span>
          {headerActions}
        </div>
      </div>
      <div className="scroll-quiet min-h-0 min-w-0 flex-1 overflow-auto">
        {isLoading ? (
          <span className="sr-only" role="status" aria-live="polite">
            Loading hero overview…
          </span>
        ) : null}
        <table className="min-w-full border-b border-[rgb(var(--text-rgb)/0.12)] text-left text-[12px]">
        <thead className="text-[rgb(var(--text-rgb)/0.55)]">
          <tr className="uppercase tracking-[0.18em]">
            <th className="px-4 py-3 text-sm font-medium">Rank</th>
            <th className="px-4 py-3 text-sm font-medium">Hero</th>
            <th className="px-4 py-3 text-sm font-medium">Tier</th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSortToggle('winrate')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-[var(--text-strong)]"
              >
                Win rate
                {renderSortIndicator('winrate')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSortToggle('pickRate')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-[var(--text-strong)]"
              >
                Pick rate
                {renderSortIndicator('pickRate')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSortToggle('matches')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-[var(--text-strong)]"
              >
                Games
                {renderSortIndicator('matches')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSortToggle('players')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-[var(--text-strong)]"
              >
                Players
                {renderSortIndicator('players')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? LOADING_ROW_IDS.map((rowId) => <HeroOverviewRowSkeleton key={rowId} />)
            : sortedRows.map((row, index) => {
                const rankLabel = index + 1;
                const tierLabel = row.tier ?? '\u2014';

                return (
                  <tr
                    key={row.heroId}
                    className="border-t border-[rgb(var(--text-rgb)/0.08)] transition hover:bg-[rgb(var(--neutral-rgb)/0.02)]"
                  >
                    <td className="px-4 py-3 text-[rgb(var(--text-rgb)/0.55)]">
                      #{rankLabel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.iconUrl ? (
                          <img
                            src={row.iconUrl}
                            alt={`${row.name} icon`}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-sm border border-[rgb(var(--text-rgb)/0.12)] object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.12)] text-[11px] uppercase text-[rgb(var(--text-rgb)/0.5)]">
                            {row.name.slice(0, 1)}
                          </span>
                        )}
                        <strong className="font-semibold text-[var(--text-strong)]">
                          {row.name}
                        </strong>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.18)] text-[11px] font-semibold text-[rgb(var(--text-rgb)/0.8)]">
                        {tierLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--accent)]">
                      {formatPercent(row.winrate)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-strong)]">
                      {formatPercent(row.pickRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-[rgb(var(--text-rgb)/0.75)]">
                      {formatNumber(row.matches)}
                    </td>
                    <td className="px-4 py-3 text-right text-[rgb(var(--text-rgb)/0.75)]">
                      {formatNumber(row.players)}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
      </div>
    </Panel>
  );
}
