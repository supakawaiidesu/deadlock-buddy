'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import {
  fetchItemPopularityLeaderboard,
  fetchItemWinrateLeaderboard,
  type ItemStatsFilters,
  type ItemWinrateEntry,
} from '@/lib/api/analytics';
import { getItemDisplayName, getItemIconUrl } from '@/lib/data/items';
import { Panel } from '@/ui/panel';

type ItemLeaderboardPanelMode = 'winrate' | 'popularity';

type ItemLeaderboardPanelProps = {
  title: string;
  panelKey: string;
  mode: ItemLeaderboardPanelMode;
  limit?: number;
  initialEntries: ItemWinrateEntry[];
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

async function fetchLeaderboardData(
  mode: ItemLeaderboardPanelMode,
  limit: number | undefined,
  filters: ItemStatsFilters,
) {
  if (mode === 'popularity') {
    return fetchItemPopularityLeaderboard(limit, filters);
  }
  return fetchItemWinrateLeaderboard(limit, filters);
}

export function ItemLeaderboardPanel({ title, panelKey, mode, limit, initialEntries }: ItemLeaderboardPanelProps) {
  const [filters, setFilters] = useState<ItemStatsFilters>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({ minDate: '', maxDate: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  const queryKey = useMemo(
    () => ['item-leaderboard', panelKey, mode, limit ?? null, filters.minUnixTimestamp ?? null, filters.maxUnixTimestamp ?? null] as const,
    [panelKey, mode, limit, filters.minUnixTimestamp, filters.maxUnixTimestamp],
  );

  const { data = initialEntries, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchLeaderboardData(mode, limit, filters),
    initialData: initialEntries,
    placeholderData: (previousData) => previousData ?? initialEntries,
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
    if (!isRefreshing) return;

    let raf: number;

    const animate = () => {
      setProgress((prev) => {
        const target = isFetching ? 94 : 100;
        if (prev > target) {
          return target;
        }
        if (prev >= target) {
          return prev;
        }
        const delta = isFetching ? Math.max(0.5, (target - prev) * 0.1) : Math.max(2, (target - prev) * 0.5);
        return Math.min(target, prev + delta);
      });

      raf = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [isRefreshing, isFetching]);

  useEffect(() => {
    if (!isRefreshing || isFetching) return;

    const timeout = window.setTimeout(() => {
      setIsRefreshing(false);
      setProgress(0);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isRefreshing, isFetching]);

  const beginRefresh = () => {
    setIsRefreshing(true);
    setProgress(0);
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

    const nextFilters: ItemStatsFilters = {
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

  const hasFilters =
    typeof filters.minUnixTimestamp === 'number' || typeof filters.maxUnixTimestamp === 'number';

  return (
    <Panel className="flex flex-col gap-[2px] !p-0">
      <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</h2>
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

        <ul className="flex max-h-80 flex-col overflow-y-auto pr-2 scroll-quiet">
          {isRefreshing ? (
            <li className="px-4 pt-2">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[rgba(245,247,245,0.14)]">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.55)]">
                Fetching stats…
              </span>
            </li>
          ) : null}

          {hasFilters ? (
            <li className="px-4 pt-3 text-[9px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.5)]">
              Filters active
            </li>
          ) : null}

          {isError ? (
            <li className="px-4 py-4 text-xs text-[rgba(245,247,245,0.6)]">
              Failed to load item stats. Try adjusting your filters.
            </li>
          ) : data.length === 0 ? (
            <li className="px-4 py-4 text-xs text-[rgba(245,247,245,0.6)]">No item data available.</li>
          ) : (
            data.map((entry) => {
              const itemName = getItemDisplayName(entry.itemId);
              const iconUrl = getItemIconUrl(entry.itemId);
              const winRatePercent = `${(entry.winrate * 100).toFixed(1)}%`;

              return (
                <li
                  key={`${panelKey}-${entry.itemId}`}
                  className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.72)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[rgba(245,247,245,0.45)]">#{entry.rank}</span>
                    {iconUrl ? (
                      <Image
                        src={iconUrl}
                        alt={`${itemName} icon`}
                        width={28}
                        height={28}
                        sizes="28px"
                        className="h-7 w-7 object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center border border-[rgba(255,255,255,0.12)] text-[10px] uppercase text-[rgba(245,247,245,0.55)]">
                        {itemName.slice(0, 1)}
                      </span>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-white">{itemName}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                        Winrate {winRatePercent}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[var(--accent)]">
                      Matches {entry.matches.toLocaleString()}
                    </span>
                    {typeof entry.players === 'number' ? (
                      <span className="block text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                        Players {entry.players.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}

          {isFetching ? (
            <li className="px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(245,247,245,0.5)]">
              Refreshing…
            </li>
          ) : null}
        </ul>
      </div>
    </Panel>
  );
}
