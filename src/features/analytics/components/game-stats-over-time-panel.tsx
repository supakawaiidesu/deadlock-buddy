import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Filter, RotateCw } from 'lucide-react';
import { AnalyticsTimeSeriesFilterControls } from '@/features/analytics/components/analytics-time-series-filter-controls';
import {
  GameStatsMetricChart,
  type GameStatsChartSeries,
} from '@/features/analytics/components/game-stats-metric-chart';
import { useGameStats } from '@/features/analytics/api/queries';
import {
  GAME_STATS_METRIC_DEFINITIONS,
  GAME_STATS_METRIC_LIMIT,
  GAME_STATS_METRICS,
  formatGameStatsAxisValue,
  formatGameStatsTooltipValue,
  gameStatsMetricMinMove,
  gameStatsSeriesColor,
} from '@/features/analytics/lib/game-stats-metrics';
import {
  buildGameStatsMetricSeries,
  type GameStatsMetric,
} from '@/features/analytics/lib/game-stats-timeseries';
import type { GameStatsTimeSeriesSettings } from '@/features/dashboard/dashboard-types';
import { getChartWidgetPresentation } from '@/features/widgets/widget-responsive';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';
import { Panel } from '@/ui/panel';

type GameStatsOverTimePanelProps = {
  settings: GameStatsTimeSeriesSettings;
  onSettingsChange: (next: GameStatsTimeSeriesSettings) => void;
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};

function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading game stats history"
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

export function GameStatsOverTimePanel({
  settings,
  onSettingsChange,
  headerActions,
  size,
}: GameStatsOverTimePanelProps) {
  const query = useGameStats(settings);
  const [focusedMetric, setFocusedMetric] = useState<GameStatsMetric | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const presentation = getChartWidgetPresentation(size, 640, 236);
  const chartSeries = useMemo<GameStatsChartSeries[]>(
    () => settings.metrics.map((metric, index) => ({
      metric,
      label: GAME_STATS_METRIC_DEFINITIONS[metric].label,
      color: gameStatsSeriesColor(index),
      points: buildGameStatsMetricSeries(query.data ?? [], metric),
      minMove: gameStatsMetricMinMove(metric),
      formatAxisValue: (value) => formatGameStatsAxisValue(metric, value),
      formatTooltipValue: (value) => formatGameStatsTooltipValue(metric, value),
    })),
    [query.data, settings.metrics],
  );
  const selectedMetrics = useMemo(() => new Set(settings.metrics), [settings.metrics]);
  const dailyBucketCount = useMemo(() => new Set(
    chartSeries.flatMap((entry) => entry.points.map((point) => point.time)),
  ).size, [chartSeries]);
  const hasData = dailyBucketCount > 0;
  const viewportResetKey = `${settings.minUnixTimestamp}:${settings.minAverageBadge}:${settings.maxAverageBadge}:${settings.metrics.join(',')}`;

  useEffect(() => {
    if (presentation === 'chart') setIsFilterOpen(false);
  }, [presentation]);

  const updateSettings = (patch: Partial<GameStatsTimeSeriesSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };
  const toggleMetric = (metric: GameStatsMetric) => {
    if (selectedMetrics.has(metric)) {
      if (settings.metrics.length === 1) return;
      updateSettings({ metrics: settings.metrics.filter((selected) => selected !== metric) });
      return;
    }
    if (settings.metrics.length >= GAME_STATS_METRIC_LIMIT) return;
    updateSettings({ metrics: [...settings.metrics, metric] });
  };
  const renderFilterControls = (mode: 'strip' | 'overlay') => (
    <AnalyticsTimeSeriesFilterControls
      values={settings}
      onChange={updateSettings}
      mode={mode}
    >
      <details
        className="group relative flex min-w-0 flex-1"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            event.currentTarget.removeAttribute('open');
          }
        }}
      >
        <summary className="panel-header-interactive flex h-full w-full cursor-pointer list-none items-center justify-between gap-2 px-3 marker:hidden">
          <span className="flex min-w-0 flex-col justify-center gap-0.5">
            <span className="text-[9px] font-normal uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.45)]">
              Stats
            </span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
              {settings.metrics.length} selected
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)] transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="scroll-quiet absolute left-0 top-[calc(100%+4px)] z-40 max-h-72 w-full overflow-y-auto border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--surface)] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]">
          {GAME_STATS_METRICS.map((metric) => {
            const selected = selectedMetrics.has(metric.id);
            const selectedIndex = settings.metrics.indexOf(metric.id);
            const unavailable = !selected && settings.metrics.length >= GAME_STATS_METRIC_LIMIT;
            return (
              <button
                key={metric.id}
                type="button"
                aria-pressed={selected}
                disabled={unavailable || (selected && settings.metrics.length === 1)}
                data-unavailable={unavailable}
                onClick={() => toggleMetric(metric.id)}
                className="panel-header-interactive flex h-11 w-full items-stretch border-b border-[var(--surface-border-muted)] text-left text-xs text-[rgb(var(--text-rgb)/0.72)] last:border-b-0 disabled:cursor-not-allowed data-[unavailable=true]:opacity-35"
              >
                <span className="flex min-w-0 flex-1 items-center px-3 font-medium">
                  <span className="truncate">{metric.label}</span>
                </span>
                <span
                  className="flex h-full w-11 shrink-0 items-center justify-center border-l border-[var(--surface-border-muted)] transition-colors"
                  style={selected ? {
                    backgroundColor: gameStatsSeriesColor(selectedIndex),
                    color: 'var(--background)',
                  } : undefined}
                  aria-hidden="true"
                >
                  {selected ? <Check className="h-4 w-4" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </details>
    </AnalyticsTimeSeriesFilterControls>
  );

  return (
    <Panel className="flex h-full min-w-0 flex-col gap-0 !p-0" aria-label="Game stats over time">
      <div className="panel-header">
        {presentation === 'chart' ? renderFilterControls('strip') : (
          <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            Game stats over time
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
        {presentation === 'summary' ? null : (
          <div
            className={presentation === 'compact-chart'
              ? 'absolute right-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-row-reverse flex-wrap items-center gap-1 border border-[rgb(var(--text-rgb)/0.12)] bg-[var(--overlay-soft-background)] p-1 shadow-sm shadow-[rgb(var(--shadow-rgb)/0.2)]'
              : 'absolute right-12 top-3 z-20 flex max-w-[calc(100%-4rem)] flex-row-reverse flex-wrap items-center gap-1 border border-[rgb(var(--text-rgb)/0.12)] bg-[var(--overlay-soft-background)] p-1 shadow-sm shadow-[rgb(var(--shadow-rgb)/0.2)]'}
            aria-label="Tracked game stats"
          >
            {chartSeries.map((entry) => {
              const isFocused = focusedMetric === entry.metric;
              const isDimmed = focusedMetric !== null && !isFocused;
              return (
                <button
                  key={entry.metric}
                  type="button"
                  onMouseEnter={() => setFocusedMetric(entry.metric)}
                  onMouseLeave={() => setFocusedMetric(null)}
                  onFocus={() => setFocusedMetric(entry.metric)}
                  onBlur={() => setFocusedMetric(null)}
                  aria-label={`Focus ${entry.label}`}
                  title={entry.label}
                  className="flex h-6 min-w-0 max-w-40 items-center gap-1.5 border px-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-[filter,opacity,transform] duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                  style={{
                    borderColor: entry.color,
                    filter: isDimmed ? 'grayscale(1)' : 'none',
                    opacity: isDimmed ? 0.35 : 1,
                  }}
                >
                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                  <span className="truncate">{entry.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {query.isFetching && hasData ? (
          <div className="absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-[var(--accent)]" role="status" aria-label="Refreshing game stats history" />
        ) : null}
        {query.isPending && !hasData ? <ChartSkeleton /> : null}
        {query.isError && !hasData ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto px-4 text-center scroll-quiet">
            <p className="text-xs text-[rgb(var(--text-rgb)/0.65)]">Couldn’t load game stats history.</p>
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
            No game stats in this period. Choose another date, rank, or stat.
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
                <span>{settings.metrics.length} stats across {dailyBucketCount} daily buckets</span>
                <span>Resize taller to view chart</span>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 pb-2 pl-2 pt-3">
                <GameStatsMetricChart
                  series={chartSeries}
                  focusedMetric={focusedMetric}
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
