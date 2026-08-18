import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, Filter, RotateCw } from 'lucide-react';
import type { HeroWinrateOverTimeSettings } from '@/features/dashboard/dashboard-types';
import { useHeroWinrateTimeSeries } from '@/features/heroes/api/queries';
import { HeroWinrateLightweightChart } from '@/features/heroes/components/hero-winrate-lightweight-chart';
import { buildHeroWinrateTimeline } from '@/features/heroes/lib/winrate-timeseries';
import { heroSummaries, getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { buildTierLabel, getRankBadgeImageUrl, RANK_TIERS } from '@/lib/data/ranks';
import { Panel } from '@/ui/panel';
import { getChartWidgetPresentation } from '@/features/widgets/widget-responsive';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';

type HeroWinrateOverTimePanelProps = {
  settings: HeroWinrateOverTimeSettings;
  onSettingsChange: (next: HeroWinrateOverTimeSettings) => void;
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};

type TrackedHero = {
  heroId: number;
  name: string;
  iconUrl: string | null;
  color: string;
};

const HERO_LIMIT = 8;
const CHART_SERIES_COUNT = 8;
const CHART_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
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
  return [
    {
      value: 0,
      label: 'All ranks',
      imageUrl: null,
    },
    ...RANK_TIERS.flatMap((tier) =>
      Array.from({ length: tier.end - tier.start + 1 }, (_, index) => {
        const value = tier.start + index;
        const rank = buildTierLabel(value);
        return {
          value,
          label: rank.label,
          imageUrl: getRankBadgeImageUrl({ badge: value }),
        };
      }),
    ),
  ];
}

function seriesColor(heroId: number): string {
  const colorIndex = Math.abs(heroId * 31) % CHART_SERIES_COUNT;
  return `var(--chart-series-${colorIndex + 1})`;
}

function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading hero win rate history"
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

export function HeroWinrateOverTimePanel({
  settings,
  onSettingsChange,
  headerActions,
  size,
}: HeroWinrateOverTimePanelProps) {
  const query = useHeroWinrateTimeSeries(settings);
  const options = useMemo(rankOptions, []);
  const rankMenuRef = useRef<HTMLDetailsElement>(null);
  const [focusedHeroId, setFocusedHeroId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const presentation = getChartWidgetPresentation(size, 640, 236);
  const timeline = useMemo(
    () => buildHeroWinrateTimeline(query.data ?? []),
    [query.data],
  );
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
  const hasData = timeline.length > 0;
  const minimumRankLabel = settings.minAverageBadge === 0
    ? 'All ranks'
    : `${buildTierLabel(settings.minAverageBadge).label}+`;
  const minimumRankImageUrl = settings.minAverageBadge === 0
    ? null
    : getRankBadgeImageUrl({ badge: settings.minAverageBadge });
  const viewportResetKey = `${settings.minUnixTimestamp}:${settings.minAverageBadge}:${settings.maxAverageBadge}:${settings.heroIds.join(',')}`;

  useEffect(() => {
    if (presentation === 'chart') setIsFilterOpen(false);
  }, [presentation]);

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
  const renderFilterControls = (mode: 'strip' | 'overlay') => (
    <div className={mode === 'strip'
      ? 'contents'
      : 'absolute inset-2 z-30 flex min-h-0 flex-col overflow-y-auto border border-[var(--surface-border-muted)] bg-[var(--overlay-background)] scroll-quiet'}>
      <div className={mode === 'strip'
        ? 'contents'
        : 'grid min-w-0 grid-cols-1 divide-y divide-[var(--surface-border-muted)]'}>
        <div className="contents">
        <details
          ref={rankMenuRef}
          className="group relative flex min-w-0 flex-1 border-r border-[var(--surface-border-muted)]"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              event.currentTarget.removeAttribute('open');
            }
          }}
        >
          <summary className="panel-header-interactive flex h-full w-full cursor-pointer list-none items-stretch marker:hidden">
            <span className="flex h-full w-12 shrink-0 items-center justify-center border-r border-[var(--surface-border-muted)] bg-[var(--surface-muted)]" aria-hidden="true">
              {minimumRankImageUrl ? (
                <img
                  src={minimumRankImageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-contain p-1"
                  decoding="async"
                />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3">
              <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.45)]">
                Rank
              </span>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
                {minimumRankLabel}
              </span>
            </span>
            <ChevronDown className="mx-3 h-3.5 w-3.5 shrink-0 self-center text-[rgb(var(--text-rgb)/0.45)] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="scroll-quiet absolute left-0 top-[calc(100%+4px)] z-40 max-h-72 w-full overflow-y-auto border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--surface)] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]">
            {options.map((option) => {
              const selected = settings.minAverageBadge === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  data-selected={selected}
                  onClick={() => {
                    updateSettings({
                      minAverageBadge: option.value,
                      maxAverageBadge: 116,
                    });
                    rankMenuRef.current?.removeAttribute('open');
                  }}
                  className="panel-header-interactive flex h-11 w-full items-stretch border-b border-[var(--surface-border-muted)] text-left text-xs text-[rgb(var(--text-rgb)/0.72)] last:border-b-0 data-[selected=true]:bg-[var(--accent-subtle)] data-[selected=true]:text-[var(--text-strong)]"
                >
                  <span
                    className="flex h-full w-11 shrink-0 items-center justify-center border-r border-[var(--surface-border-muted)] bg-[var(--surface-muted)]"
                    aria-hidden="true"
                  >
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center px-3 font-medium">
                    {option.label}{option.value === 0 ? '' : '+'}
                  </span>
                  {selected ? <Check className="mx-3 h-3.5 w-3.5 self-center text-[var(--accent)]" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </details>

        <label className="search-field panel-header-interactive relative flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 border-r border-[var(--surface-border-muted)] px-3">
          <span aria-hidden="true" className="flex min-w-0 flex-col justify-center gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.45)]">
              Since
            </span>
            <time
              dateTime={dateInputValue(settings.minUnixTimestamp)}
              className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]"
            >
              {CHART_DATE_FORMATTER.format(new Date(settings.minUnixTimestamp * 1000))}
            </time>
          </span>
          <CalendarDays className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)]" aria-hidden="true" />
          <input
            type="date"
            aria-label="History start date"
            value={dateInputValue(settings.minUnixTimestamp)}
            max={dateInputValue(Date.now() / 1000)}
            onClick={(event) => event.currentTarget.showPicker()}
            onChange={(event) => {
              const timestamp = parseUtcDate(event.target.value);
              if (timestamp !== null) updateSettings({ minUnixTimestamp: timestamp });
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 outline-none"
          />
        </label>

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
                Heroes
              </span>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
                {settings.heroIds.length} selected
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="scroll-quiet absolute left-0 top-[calc(100%+4px)] z-40 max-h-72 w-full overflow-y-auto border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--surface)] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]">
            {heroSummaries.map((hero) => {
              const selected = selectedIds.has(hero.id);
              const unavailable = !selected && settings.heroIds.length >= HERO_LIMIT;
              const iconUrl = hero.icon.webp ?? hero.icon.png;
              return (
                <button
                  key={hero.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={unavailable || (selected && settings.heroIds.length === 1)}
                  data-unavailable={unavailable}
                  onClick={() => toggleHero(hero.id)}
                  className="panel-header-interactive flex h-12 w-full items-stretch border-b border-[var(--surface-border-muted)] text-left text-xs text-[rgb(var(--text-rgb)/0.72)] last:border-b-0 disabled:cursor-not-allowed data-[unavailable=true]:opacity-35"
                >
                  <span className="relative h-full w-12 shrink-0 overflow-hidden border-r border-[var(--surface-border-muted)] bg-[var(--surface-muted)]">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" width={48} height={48} className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center px-3 font-medium">
                    <span className="truncate">{hero.name}</span>
                  </span>
                  <span
                    className="flex h-full w-12 shrink-0 items-center justify-center border-l border-[var(--surface-border-muted)] transition-colors"
                    style={selected ? {
                      backgroundColor: seriesColor(hero.id),
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
        </div>
      </div>
    </div>
  );
  return (
    <Panel className="flex h-full min-w-0 flex-col gap-0 !p-0" aria-label="Hero win rate over time">
      <div className="panel-header">
        {presentation === 'chart' ? renderFilterControls('strip') : (
          <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
            Hero win rate over time
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
              : 'absolute right-12 top-3 z-20 flex flex-row-reverse items-center gap-1 border border-[rgb(var(--text-rgb)/0.12)] bg-[var(--overlay-soft-background)] p-1 shadow-sm shadow-[rgb(var(--shadow-rgb)/0.2)]'}
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
        )}
        {query.isFetching && hasData ? (
          <div className="absolute inset-x-0 top-0 z-10 h-px animate-pulse bg-[var(--accent)]" role="status" aria-label="Refreshing win rate history" />
        ) : null}
        {query.isPending && !hasData ? <ChartSkeleton /> : null}
        {query.isError && !hasData ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto px-4 text-center scroll-quiet">
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
          <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-6 text-center text-xs text-[rgb(var(--text-rgb)/0.6)] scroll-quiet">
            No matches for these heroes in this period. Choose another date, rank, or hero.
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
                <span>{trackedHeroes.length} heroes across {timeline.length} days</span>
                <span>Resize taller to view chart</span>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 pb-2 pl-2 pt-3">
                <HeroWinrateLightweightChart
                  timeline={timeline}
                  heroes={trackedHeroes}
                  focusedHeroId={focusedHeroId}
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
