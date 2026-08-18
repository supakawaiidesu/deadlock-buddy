import { useMemo, useRef, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import type { AnalyticsTimeSeriesFilterValues } from '@/features/analytics/lib/time-series-filters';
import { buildTierLabel, getRankBadgeImageUrl, RANK_TIERS } from '@/lib/data/ranks';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
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

function buildRankOptions() {
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

export function AnalyticsTimeSeriesFilterControls({
  values,
  onChange,
  mode,
  children,
}: {
  values: AnalyticsTimeSeriesFilterValues;
  onChange: (patch: Partial<AnalyticsTimeSeriesFilterValues>) => void;
  mode: 'strip' | 'overlay';
  children?: ReactNode;
}) {
  const options = useMemo(buildRankOptions, []);
  const rankMenuRef = useRef<HTMLDetailsElement>(null);
  const minimumRankLabel = values.minAverageBadge === 0
    ? 'All ranks'
    : `${buildTierLabel(values.minAverageBadge).label}+`;
  const minimumRankImageUrl = values.minAverageBadge === 0
    ? null
    : getRankBadgeImageUrl({ badge: values.minAverageBadge });

  return (
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
                const selected = values.minAverageBadge === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    data-selected={selected}
                    onClick={() => {
                      onChange({
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
                dateTime={dateInputValue(values.minUnixTimestamp)}
                className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]"
              >
                {DATE_FORMATTER.format(new Date(values.minUnixTimestamp * 1000))}
              </time>
            </span>
            <CalendarDays className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)]" aria-hidden="true" />
            <input
              type="date"
              aria-label="History start date"
              value={dateInputValue(values.minUnixTimestamp)}
              max={dateInputValue(Date.now() / 1000)}
              onClick={(event) => event.currentTarget.showPicker()}
              onChange={(event) => {
                const timestamp = parseUtcDate(event.target.value);
                if (timestamp !== null) onChange({ minUnixTimestamp: timestamp });
              }}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 outline-none"
            />
          </label>

          {children}
        </div>
      </div>
    </div>
  );
}
