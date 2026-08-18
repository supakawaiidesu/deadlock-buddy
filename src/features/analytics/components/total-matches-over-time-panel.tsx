import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Filter, RotateCw } from 'lucide-react';
import { AnalyticsTimeSeriesFilterControls } from '@/features/analytics/components/analytics-time-series-filter-controls';
import { GameStatsMetricChart } from '@/features/analytics/components/game-stats-metric-chart';
import { useGameStats } from '@/features/analytics/api/queries';
import { buildGameStatsMetricSeries } from '@/features/analytics/lib/game-stats-timeseries';
import type { GameStatsTimeSeriesSettings } from '@/features/dashboard/dashboard-types';
import { getChartWidgetPresentation } from '@/features/widgets/widget-responsive';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';
import { formatCompactNumber, formatNumber } from '@/lib/utils/format';
import { Panel } from '@/ui/panel';

type TotalMatchesOverTimePanelProps = {
  settings: GameStatsTimeSeriesSettings;
  onSettingsChange: (next: GameStatsTimeSeriesSettings) => void;
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};

function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading total match history"
      className="flex h-full min-h-0 animate-pulse flex-col justify-end gap-5 px-4 pb-8"
    >
      {[58, 72, 46, 64].map((width, index) => (
        <div
          key={width}
          className="h-px bg-[rgb(var(--text-rgb)/0.12)]"
          style={{ width: `${width}%`, marginLeft: `${index * 7}%` }}
        />
      ))}
    </div>
  );
}

export function TotalMatchesOverTimePanel({
  settings,
  onSettingsChange,
  headerActions,
  size,
}: TotalMatchesOverTimePanelProps) {
  const query = useGameStats(settings);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const presentation = getChartWidgetPresentation(size, 640, 236);
  const points = useMemo(
    () => buildGameStatsMetricSeries(query.data ?? [], 'total_matches'),
    [query.data],
  );
  const hasData = points.length > 0;
  const latestPoint = points.at(-1);
  const viewportResetKey = `${settings.minUnixTimestamp}:${settings.minAverageBadge}:${settings.maxAverageBadge}`;

  useEffect(() => {
    if (presentation === 'chart') setIsFilterOpen(false);
  }, [presentation]);

  const updateSettings = (patch: Partial<GameStatsTimeSeriesSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };
  const renderFilterControls = (mode: 'strip' | 'overlay') => (
    <AnalyticsTimeSeriesFilterControls
      values={settings}
      onChange={updateSettings}
      mode={mode}
    />
  );

  return (
    <Panel className="flex h-full min-w-0 flex-col gap-0 !p-0" aria-label="Total matches over time">
      <div className="panel-header">
        {presentation === 'chart' ? renderFilterControls('strip') : (
          <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            Total matches over time
          </h2>
        )}
        {presentation === 'chart' ? null : (
          <button
            type="button"
            onClick={() => setIsFilterOpen((open) => !open)}
            className={isFilterOpen ? 'panel-header-action bg-[var(--accent-muted)] text-[var(--accent)]' : 'panel-header-action'}
            aria-label={isFilterOpen ? 'Close chart filters' : 'Open chart filters'}
            title={isFilterOpen ? 'Close chart filters' : 'Open chart filters'}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="panel-header-actions">{headerActions}</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isFilterOpen && presentation !== 'chart' ? renderFilterControls('overlay') : null}
        {query.isFetching && hasData ? (
          <div className="absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-[var(--accent)]" role="status" aria-label="Refreshing total match history" />
        ) : null}
        {query.isPending && !hasData ? <ChartSkeleton /> : null}
        {query.isError && !hasData ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto px-4 text-center scroll-quiet">
            <p className="text-xs text-[rgb(var(--text-rgb)/0.65)]">Couldn’t load total match history.</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="flex items-center gap-2 border border-[var(--surface-border-muted)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-strong)] hover:border-[var(--accent)]"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : null}
        {!query.isPending && !query.isError && !hasData ? (
          <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-6 text-center text-xs text-[rgb(var(--text-rgb)/0.6)] scroll-quiet">
            No matches in this period. Choose another date or rank.
          </div>
        ) : null}
        {hasData ? (
          <div className="flex h-full min-h-0 flex-col">
            {query.isError ? (
              <div className="shrink-0 border-b border-[var(--surface-border-muted)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--danger)]">
                Data may be stale
              </div>
            ) : null}
            {presentation === 'summary' ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-3 text-center text-xs text-[rgb(var(--text-rgb)/0.6)] scroll-quiet">
                <span>{points.length} daily buckets · {formatNumber(latestPoint?.value ?? 0)} matches latest</span>
                <span>Resize taller to view chart</span>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 pb-2 pl-2 pt-3">
                <GameStatsMetricChart
                  points={points}
                  seriesLabel="Total matches"
                  color="var(--chart-series-1)"
                  formatAxisValue={formatCompactNumber}
                  formatTooltipValue={(value) => `${formatNumber(value)} matches`}
                  minMove={1}
                  viewportResetKey={viewportResetKey}
                  compact={presentation === 'compact-chart'}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
