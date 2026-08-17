import { useMemo, useState, type ReactNode } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { ChevronDown, Plus, RotateCw } from 'lucide-react';
import type { HeroWinrateOverTimeSettings } from '@/features/dashboard/dashboard-types';
import { useHeroWinrateTimeSeries } from '@/features/heroes/api/queries';
import type { HeroWinratePoint, HeroWinrateSeries } from '@/features/heroes/lib/winrate-timeseries';
import { heroSummaries, getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { buildTierLabel, RANK_TIERS } from '@/lib/data/ranks';
import { Panel } from '@/ui/panel';

type HeroWinrateOverTimePanelProps = {
  settings: HeroWinrateOverTimeSettings;
  onSettingsChange: (next: HeroWinrateOverTimeSettings) => void;
  headerActions?: ReactNode;
};

type ChartDatum = {
  time: number;
  values: Record<number, HeroWinratePoint>;
  [key: `hero-${number}`]: number | undefined;
};

type TrackedHero = {
  heroId: number;
  name: string;
  iconUrl: string | null;
  color: string;
};

const HERO_LIMIT = 8;
const CHART_SERIES_COUNT = 8;
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const AXIS_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function dateInputValue(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function parseUtcDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day) / 1000;
  const date = new Date(timestamp * 1000);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
  return timestamp > todayUtc ? null : timestamp;
}

function rankOptions() {
  return RANK_TIERS.flatMap((tier) =>
    Array.from({ length: tier.end - tier.start + 1 }, (_, index) => {
      const value = tier.start + index;
      return { value, label: buildTierLabel(value).label };
    }),
  );
}

function seriesColor(heroId: number): string {
  const colorIndex = Math.abs(heroId * 31) % CHART_SERIES_COUNT;
  return `var(--chart-series-${colorIndex + 1})`;
}

function mergeSeries(series: readonly HeroWinrateSeries[]): ChartDatum[] {
  const byTime = new Map<number, ChartDatum>();
  for (const heroSeries of series) {
    for (const point of heroSeries.points) {
      const current = byTime.get(point.time) ?? { time: point.time, values: {} };
      current.values[heroSeries.heroId] = point;
      current[`hero-${heroSeries.heroId}`] = point.winrate;
      byTime.set(point.time, current);
    }
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

function HeroWinrateTooltip({ active, label, payload }: TooltipContentProps<number, string>) {
  if (!active || typeof label !== 'number' || !payload?.length) return null;

  const rows = payload.flatMap((entry) => {
    const heroId = Number(entry.name);
    const datum = entry.payload as ChartDatum | undefined;
    const point = datum?.values[heroId];
    if (!Number.isSafeInteger(heroId) || !point) return [];
    return [{ heroId, point, color: entry.color }];
  });
  if (rows.length === 0) return null;

  return (
    <div className="border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] px-3 py-2 text-xs shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-strong)]">
        {DATE_FORMAT.format(new Date(label * 1000))}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ heroId, point, color }) => (
          <div key={heroId} className="grid grid-cols-[minmax(7rem,1fr)_auto] gap-x-5 gap-y-0.5">
            <span className="font-semibold" style={{ color }}>{getHeroDisplayName(heroId)}</span>
            <span className="text-right font-semibold text-[var(--text-strong)]">
              {(point.winrate * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.5)]">
              {point.wins.toLocaleString()}–{point.losses.toLocaleString()}
            </span>
            <span className="text-right text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.5)]">
              {point.matches.toLocaleString()} matches
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading hero win rate history"
      className="flex h-full min-h-[180px] animate-pulse flex-col justify-end gap-5 px-4 pb-8"
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

export function HeroWinrateOverTimePanel({
  settings,
  onSettingsChange,
  headerActions,
}: HeroWinrateOverTimePanelProps) {
  const query = useHeroWinrateTimeSeries(settings);
  const options = useMemo(rankOptions, []);
  const [focusedHeroId, setFocusedHeroId] = useState<number | null>(null);
  const series = query.data ?? [];
  const chartData = useMemo(() => mergeSeries(series), [series]);
  const trackedHeroes = useMemo<TrackedHero[]>(
    () => settings.heroIds.map((heroId) => ({
      heroId,
      name: getHeroDisplayName(heroId),
      iconUrl: getHeroIconUrl(heroId),
      color: seriesColor(heroId),
    })),
    [settings.heroIds],
  );
  const selectedIds = useMemo(() => new Set(settings.heroIds), [settings.heroIds]);
  const hasData = chartData.length > 0;

  const updateSettings = (patch: Partial<HeroWinrateOverTimeSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };
  const toggleHero = (heroId: number) => {
    if (selectedIds.has(heroId)) {
      if (settings.heroIds.length === 1) return;
      updateSettings({ heroIds: settings.heroIds.filter((id) => id !== heroId) });
      return;
    }
    if (settings.heroIds.length >= HERO_LIMIT) return;
    updateSettings({ heroIds: [...settings.heroIds, heroId] });
  };

  return (
    <Panel className="flex h-full min-w-0 flex-col gap-0 !p-0">
      <div className="panel-header">
        <div className="min-w-0 flex-1 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            Chart Widget
          </h2>
        </div>
        <div className="panel-header-actions">{headerActions}</div>
      </div>

      <div className="flex min-h-10 shrink-0 items-stretch border-b border-[var(--surface-border-muted)]">
        <label className="relative flex min-w-0 flex-1 items-center gap-1 border-r border-[var(--surface-border-muted)] px-3">
          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--text-rgb)/0.45)]">
            Rank:
          </span>
          <select
            aria-label="Minimum average rank"
            value={settings.minAverageBadge}
            onChange={(event) => updateSettings({
              minAverageBadge: Number(event.target.value),
              maxAverageBadge: 116,
            })}
            className="min-w-0 flex-1 cursor-pointer appearance-none pr-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)] outline-none"
          >
            <option value={0}>All ranks</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}+</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[rgb(var(--text-rgb)/0.45)]" aria-hidden="true" />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1 border-r border-[var(--surface-border-muted)] px-3">
          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--text-rgb)/0.45)]">
            Since:
          </span>
          <input
            type="date"
            aria-label="History start date"
            value={dateInputValue(settings.minUnixTimestamp)}
            max={dateInputValue(Date.now() / 1000)}
            onChange={(event) => {
              const timestamp = parseUtcDate(event.target.value);
              if (timestamp !== null) updateSettings({ minUnixTimestamp: timestamp });
            }}
            className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)] outline-none"
          />
        </label>
        <details className="group relative flex min-w-0 flex-1">
          <summary className="flex h-full w-full cursor-pointer list-none items-center justify-between gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)] marker:hidden">
            <span className="min-w-0 truncate">
              <span className="text-[10px] font-normal tracking-[0.16em] text-[rgb(var(--text-rgb)/0.45)]">Heroes:</span>{' '}
              {settings.heroIds.length} selected
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="scroll-quiet absolute right-0 top-full z-40 max-h-64 w-64 overflow-y-auto border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] p-1 shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]">
            {heroSummaries.map((hero) => {
              const selected = selectedIds.has(hero.id);
              const disabled = !selected && settings.heroIds.length >= HERO_LIMIT;
              const iconUrl = hero.icon.webp ?? hero.icon.png;
              return (
                <button
                  key={hero.id}
                  type="button"
                  disabled={disabled || (selected && settings.heroIds.length === 1)}
                  onClick={() => toggleHero(hero.id)}
                  className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-xs text-[rgb(var(--text-rgb)/0.72)] hover:border-[var(--surface-border-muted)] hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {iconUrl ? (
                    <img src={iconUrl} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-cover" />
                  ) : (
                    <span className="h-6 w-6 shrink-0 border border-[rgb(var(--text-rgb)/0.14)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{hero.name}</span>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-[rgb(var(--text-rgb)/0.2)] text-[10px] text-[var(--accent)]">
                    {selected ? '✓' : <Plus className="h-3 w-3" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className="absolute right-3 top-3 z-20 flex items-center gap-1 border border-[rgb(var(--text-rgb)/0.12)] bg-[var(--overlay-soft-background)] p-1 shadow-sm shadow-[rgb(var(--shadow-rgb)/0.2)]"
          aria-label="Tracked heroes"
        >
          {trackedHeroes.map((hero) => {
            const isFocused = focusedHeroId === hero.heroId;
            const isDimmed = focusedHeroId !== null && !isFocused;
            return (
              <button
                key={hero.heroId}
                type="button"
                onMouseEnter={() => setFocusedHeroId(hero.heroId)}
                onMouseLeave={() => setFocusedHeroId(null)}
                onFocus={() => setFocusedHeroId(hero.heroId)}
                onBlur={() => setFocusedHeroId(null)}
                aria-label={`Focus ${hero.name}`}
                title={hero.name}
                className="relative h-6 w-6 shrink-0 overflow-hidden border transition-[filter,opacity,transform] duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                style={{
                  borderColor: hero.color,
                  filter: isDimmed ? 'grayscale(1)' : 'none',
                  opacity: isDimmed ? 0.35 : 1,
                }}
              >
                {hero.iconUrl ? (
                  <img src={hero.iconUrl} alt="" width={24} height={24} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-[var(--text-strong)]">
                    {hero.name.slice(0, 1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {query.isFetching && hasData ? (
          <div className="absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-[var(--accent)]" role="status" aria-label="Refreshing win rate history" />
        ) : null}
        {query.isPending ? <ChartSkeleton /> : null}
        {query.isError && !hasData ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-xs text-[rgb(var(--text-rgb)/0.65)]">Couldn’t load win rate history.</p>
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
          <div className="flex h-full min-h-[180px] items-center justify-center px-6 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
            No matches for these heroes in this period. Choose another date, rank, or hero.
          </div>
        ) : null}
        {hasData ? (
          <div className="flex h-full min-h-[180px] flex-col">
            {query.isError ? (
              <div className="shrink-0 border-b border-[var(--surface-border-muted)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--danger)]">
                Data may be stale
              </div>
            ) : null}
            <div className="min-h-0 flex-1 px-2 pb-2 pt-3">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgb(var(--text-rgb)/0.07)" vertical={false} />
                  <XAxis
                    type="number"
                    dataKey="time"
                    domain={['dataMin', 'dataMax']}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--text-rgb)/0.12)' }}
                    tick={{ fontSize: 10, fill: 'rgb(var(--text-rgb)/0.5)' }}
                    tickFormatter={(value: number) => AXIS_DATE_FORMAT.format(new Date(value * 1000))}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--text-rgb)/0.12)' }}
                    tick={{ fontSize: 10, fill: 'rgb(var(--text-rgb)/0.5)' }}
                    tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                    width={38}
                  />
                  <ReferenceLine y={0.5} stroke="rgb(var(--text-rgb)/0.2)" strokeDasharray="3 3" />
                  <Tooltip content={HeroWinrateTooltip} cursor={{ stroke: 'rgb(var(--text-rgb)/0.18)' }} />
                  {trackedHeroes.map((hero) => {
                    const isFocused = focusedHeroId === hero.heroId;
                    const isDimmed = focusedHeroId !== null && !isFocused;
                    return (
                      <Line
                        key={hero.heroId}
                        type="linear"
                        dataKey={`hero-${hero.heroId}`}
                        name={String(hero.heroId)}
                        stroke={hero.color}
                        strokeWidth={isFocused ? 3 : 2}
                        strokeOpacity={isDimmed ? 0.16 : 1}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
