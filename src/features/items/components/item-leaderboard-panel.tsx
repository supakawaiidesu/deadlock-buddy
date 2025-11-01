'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import {
  FilterableLeaderboardPanel,
  type DateRangeFilters,
} from '@/features/analytics/components/filterable-leaderboard-panel';
import {
  fetchItemPopularityLeaderboard,
  fetchItemWinrateLeaderboard,
  type ItemStatsFilters,
  type ItemWinrateEntry,
} from '@/lib/api/analytics';
import { getItemDisplayName, getItemIconUrl } from '@/lib/data/items';

type ItemLeaderboardPanelMode = 'winrate' | 'popularity';

type ItemLeaderboardPanelProps = {
  title: string;
  panelKey: string;
  mode: ItemLeaderboardPanelMode;
  limit?: number;
  initialEntries: ItemWinrateEntry[];
};

async function fetchLeaderboardData(
  mode: ItemLeaderboardPanelMode,
  limit: number | undefined,
  filters: DateRangeFilters,
) {
  const apiFilters: ItemStatsFilters = {
    minUnixTimestamp: filters.minUnixTimestamp,
    maxUnixTimestamp: filters.maxUnixTimestamp,
  };

  if (mode === 'popularity') {
    return fetchItemPopularityLeaderboard(limit, apiFilters);
  }
  return fetchItemWinrateLeaderboard(limit, apiFilters);
}

export function ItemLeaderboardPanel({ title, panelKey, mode, limit, initialEntries }: ItemLeaderboardPanelProps) {
  const fetcher = useCallback(
    (params: { limit?: number; filters: DateRangeFilters }) =>
      fetchLeaderboardData(mode, params.limit, params.filters),
    [mode],
  );

  return (
    <FilterableLeaderboardPanel<ItemWinrateEntry>
      title={title}
      panelKey={panelKey}
      limit={limit}
      initialEntries={initialEntries}
      fetcher={fetcher}
      getEntryKey={(entry) => `${panelKey}-${entry.itemId}`}
      renderEntry={(entry) => {
        const itemName = getItemDisplayName(entry.itemId);
        const iconUrl = getItemIconUrl(entry.itemId);
        const winRatePercent = `${(entry.winrate * 100).toFixed(1)}%`;

        return (
          <>
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
          </>
        );
      }}
      emptyMessage="No item data available."
      errorMessage="Failed to load item stats. Try adjusting your filters."
    />
  );
}
