'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Settings } from 'lucide-react';
import { Panel } from '@/ui/panel';

export type DateRangeFilters = {
  minUnixTimestamp?: number;
  maxUnixTimestamp?: number;
};

type DraftFilters = {
  minDate: string;
  maxDate: string;
};

function formatDateInput(timestamp?: number): string {
  if (!timestamp) return '';
  const iso = new Date(timestamp * 1000).toISOString();
  return iso.slice(0, 10);
}

function parseDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.floor(parsed / 1000);
}

function easeOutQuad(t: number) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

function easeInOutQuad(t: number) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

function easeOutCubic(t: number) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

export type FilterableLeaderboardPanelProps<TEntry> = {
  title: string;
  panelKey: string;
  initialEntries: readonly TEntry[];
  fetcher: (params: { limit?: number; filters: DateRangeFilters }) => Promise<readonly TEntry[]>;
  getEntryKey: (entry: TEntry, index: number) => string;
  renderEntry: (entry: TEntry, index: number) => ReactNode;
  emptyMessage: string;
  errorMessage: string;
  limit?: number;
  panelClassName?: string;
  listClassName?: string;
  rowClassName?: string;
  headerSubtitle?: ReactNode;
  fetchingLabel?: string;
  refreshingLabel?: string;
};

export function FilterableLeaderboardPanel<TEntry>({
  title,
  panelKey,
  initialEntries,
  fetcher,
  getEntryKey,
  renderEntry,
  emptyMessage,
  errorMessage,
  limit,
  panelClassName,
  listClassName,
  rowClassName,
  headerSubtitle,
  fetchingLabel = 'Fetching stats…',
  refreshingLabel = 'Refreshing…',
}: FilterableLeaderboardPanelProps<TEntry>) {
  const [filters, setFilters] = useState<DateRangeFilters>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({ minDate: '', maxDate: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const completionStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const queryKey = useMemo(
    () =>
      [
        'filterable-leaderboard',
        panelKey,
        limit ?? null,
        filters.minUnixTimestamp ?? null,
        filters.maxUnixTimestamp ?? null,
      ] as const,
    [panelKey, limit, filters.minUnixTimestamp, filters.maxUnixTimestamp],
  );

  const { data = initialEntries, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetcher({ limit, filters });
      return [...result];
    },
    initialData: () => [...initialEntries],
    placeholderData: (previousData) => previousData ?? [...initialEntries],
  });

  const filtersSignature = useMemo(
    () => `${filters.minUnixTimestamp ?? ''}-${filters.maxUnixTimestamp ?? ''}`,
    [filters.minUnixTimestamp, filters.maxUnixTimestamp],
  );
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    void refetch();
  }, [filtersSignature, refetch]);

  useEffect(() => {
    if (!isRefreshing) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      completionStartRef.current = null;
      return;
    }

    const MIN_DURATION_MS = 1500;
    const COMPLETION_DURATION_MS = 420;

    const computePendingProgress = (elapsedMs: number) => {
      if (elapsedMs <= 240) {
        const t = elapsedMs / 240;
        return Math.min(24 * easeOutQuad(t), 24);
      }
      if (elapsedMs <= 1040) {
        const t = (elapsedMs - 240) / 800;
        return 24 + 34 * easeInOutQuad(t);
      }
      if (elapsedMs <= 1840) {
        const t = (elapsedMs - 1040) / 800;
        return 58 + 30 * easeInOutQuad(t);
      }
      const t = Math.min((elapsedMs - 1840) / 800, 1);
      return 88 + 5 * easeOutQuad(t);
    };

    const animate = () => {
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now();
      }

      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const shouldHold = isFetching || elapsed < MIN_DURATION_MS;

      let next = computePendingProgress(elapsed);

      if (!shouldHold) {
        if (!completionStartRef.current) {
          completionStartRef.current = now;
        }
        const completionElapsed = now - completionStartRef.current;
        const completionT = Math.min(completionElapsed / COMPLETION_DURATION_MS, 1);
        const eased = easeOutCubic(completionT);
        next = next + (100 - next) * eased;
      } else {
        completionStartRef.current = null;
      }

      setProgress((prev) => (next > prev ? Math.min(next, 100) : prev));

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRefreshing, isFetching]);

  useEffect(() => {
    if (!isRefreshing || isFetching || progress < 100) return;

    const timeout = window.setTimeout(() => {
      setIsRefreshing(false);
      setProgress(0);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isRefreshing, isFetching, progress]);

  const beginRefresh = () => {
    setIsRefreshing(true);
    setProgress(0);
    startTimeRef.current = performance.now();
    completionStartRef.current = null;
  };

  const handleToggleSettings = () => {
    if (!isSettingsOpen) {
      setDraftFilters({
        minDate: formatDateInput(filters.minUnixTimestamp),
        maxDate: formatDateInput(filters.maxUnixTimestamp),
      });
      setIsSettingsOpen(true);
      return;
    }

    const nextFilters: DateRangeFilters = {
      minUnixTimestamp: parseDateInput(draftFilters.minDate),
      maxUnixTimestamp: parseDateInput(draftFilters.maxDate),
    };

    const currentSignature = [
      filters.minUnixTimestamp ?? null,
      filters.maxUnixTimestamp ?? null,
    ] as const;
    const nextSignature = [
      nextFilters.minUnixTimestamp ?? null,
      nextFilters.maxUnixTimestamp ?? null,
    ] as const;

    setIsSettingsOpen(false);
    beginRefresh();

    if (currentSignature[0] === nextSignature[0] && currentSignature[1] === nextSignature[1]) {
      void refetch();
      return;
    }

    setFilters(nextFilters);
  };

  return (
    <Panel className={clsx('flex flex-col gap-[2px] !p-0', panelClassName)}>
      <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</h2>
          {headerSubtitle ? (
            <span className="text-[10px] uppercase tracking-[0.18em] text-[rgba(245,247,245,0.45)]">
              {headerSubtitle}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleToggleSettings}
          className="flex items-center gap-2 rounded-sm border border-[rgba(245,247,245,0.16)] bg-[rgba(245,247,245,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[rgba(245,247,245,0.65)] transition hover:border-[var(--accent)] hover:text-white"
        >
          {isSettingsOpen ? (
            'Apply'
          ) : (
            <>
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Filters</span>
            </>
          )}
        </button>
      </div>

      <div className="relative flex-1">
        {isSettingsOpen ? (
          <div className="absolute inset-0 z-10 flex flex-col gap-4 bg-[rgba(8,12,11,0.95)] p-4">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.55)]">
              <span className="text-[rgba(245,247,245,0.6)]">Date:</span>
              <label className="flex items-center gap-2 text-[rgba(245,247,245,0.55)]">
                <span>Min</span>
                <input
                  type="date"
                  value={draftFilters.minDate}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, minDate: event.target.value }))
                  }
                  className="rounded-sm border border-[rgba(245,247,245,0.18)] bg-[rgba(245,247,245,0.05)] px-2 py-1 text-[11px] normal-case tracking-normal text-white focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-[rgba(245,247,245,0.55)]">
                <span>Max</span>
                <input
                  type="date"
                  value={draftFilters.maxDate}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, maxDate: event.target.value }))
                  }
                  className="rounded-sm border border-[rgba(245,247,245,0.18)] bg-[rgba(245,247,245,0.05)] px-2 py-1 text-[11px] normal-case tracking-normal text-white focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-auto flex justify-between text-[10px] uppercase tracking-[0.18em]">
              <button
                type="button"
                onClick={() => setDraftFilters({ minDate: '', maxDate: '' })}
                className="rounded-sm border border-transparent px-2 py-1 text-[rgba(245,247,245,0.55)] transition hover:text-white"
              >
                Clear
              </button>
              <span className="text-[rgba(245,247,245,0.45)]">Click apply to refresh</span>
            </div>
          </div>
        ) : null}

        <ul className={clsx('flex max-h-80 flex-col overflow-y-auto pr-2 scroll-quiet', listClassName)}>
          {isRefreshing ? (
            <li className="px-4 pt-2">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[rgba(245,247,245,0.14)]">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.55)]">
                {fetchingLabel}
              </span>
            </li>
          ) : null}

          {isError ? (
            <li className="px-4 py-4 text-xs text-[rgba(245,247,245,0.6)]">{errorMessage}</li>
          ) : data.length === 0 ? (
            <li className="px-4 py-4 text-xs text-[rgba(245,247,245,0.6)]">{emptyMessage}</li>
          ) : (
            data.map((entry, index) => (
              <li
                key={getEntryKey(entry, index)}
                className={
                  rowClassName ??
                  'flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.72)]'
                }
              >
                {renderEntry(entry, index)}
              </li>
            ))
          )}

          {isFetching ? (
            <li className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(245,247,245,0.5)]">
              {refreshingLabel}
            </li>
          ) : null}
        </ul>
      </div>
    </Panel>
  );
}
