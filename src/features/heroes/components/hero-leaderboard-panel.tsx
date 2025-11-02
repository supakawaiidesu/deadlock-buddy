'use client';

import Image from 'next/image';
import { useCallback, type ReactNode } from 'react';
import {
  FilterableLeaderboardPanel,
  type DateRangeFilters,
} from '@/features/analytics/components/filterable-leaderboard-panel';
import { fetchHeroPopularityLeaderboard, fetchHeroWinrateLeaderboard, type HeroScoreboardFilters } from '@/lib/api/analytics';
import type { HeroScoreboardEntry } from '@/lib/api/schema';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';

type HeroLeaderboardPanelMode = 'popularity' | 'winrate';

export type HeroLeaderboardEntry = HeroScoreboardEntry & {
  winrateRank?: number;
  winrateValue?: number;
};

type HeroLeaderboardPanelProps = {
  title: string;
  panelKey: string;
  mode: HeroLeaderboardPanelMode;
  limit?: number;
  initialEntries: HeroLeaderboardEntry[];
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

function formatPercent(value?: number): string | null {
  if (typeof value !== 'number') return null;
  return `${(value * 100).toFixed(1)}%`;
}

async function fetchHeroLeaderboardData(
  mode: HeroLeaderboardPanelMode,
  limit: number | undefined,
  filters: DateRangeFilters,
): Promise<HeroLeaderboardEntry[]> {
  const heroFilters: HeroScoreboardFilters = {
    minUnixTimestamp: filters.minUnixTimestamp,
    maxUnixTimestamp: filters.maxUnixTimestamp,
  };

  if (mode === 'popularity') {
    const [popularityEntries, winrateEntries] = await Promise.all([
      fetchHeroPopularityLeaderboard(limit, heroFilters),
      fetchHeroWinrateLeaderboard(undefined, heroFilters),
    ]);

    const winrateByHeroId = new Map(winrateEntries.map((entry) => [entry.hero_id, entry]));

    return popularityEntries.map((entry) => {
      const winrate = winrateByHeroId.get(entry.hero_id);
      return {
        ...entry,
        winrateRank: winrate?.rank,
        winrateValue: winrate?.value,
      };
    });
  }

  const winrateEntries = await fetchHeroWinrateLeaderboard(limit, heroFilters);
  return winrateEntries.map((entry) => ({
    ...entry,
    winrateRank: entry.rank,
    winrateValue: entry.value,
  }));
}

export function HeroLeaderboardPanel({
  title,
  panelKey,
  mode,
  limit,
  initialEntries,
  headerActions,
  outerRef,
}: HeroLeaderboardPanelProps) {
  const fetcher = useCallback(
    (params: { limit?: number; filters: DateRangeFilters }) =>
      fetchHeroLeaderboardData(mode, params.limit, params.filters),
    [mode],
  );

  return (
    <FilterableLeaderboardPanel<HeroLeaderboardEntry>
      title={title}
      panelKey={panelKey}
      limit={limit}
      initialEntries={initialEntries}
      fetcher={fetcher}
      getEntryKey={(entry) => `${panelKey}-${entry.hero_id}`}
      headerActions={headerActions}
      outerRef={outerRef}
      renderEntry={(entry) => {
        const heroName = getHeroDisplayName(entry.hero_id);
        const iconUrl = getHeroIconUrl(entry.hero_id);
        const matchesLabel = entry.matches.toLocaleString();

        if (mode === 'popularity') {
          const winrateLabel = formatPercent(entry.winrateValue);
          const winrateRankLabel =
            typeof entry.winrateRank === 'number' ? ` (Rank #${entry.winrateRank})` : '';

          return (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[rgba(245,247,245,0.45)]">#{entry.rank}</span>
                {iconUrl ? (
                  <Image
                    src={iconUrl}
                    alt={`${heroName} icon`}
                    width={28}
                    height={28}
                    sizes="28px"
                    className="h-7 w-7 object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center border border-[rgba(255,255,255,0.12)] text-[10px] uppercase text-[rgba(245,247,245,0.55)]">
                    {heroName.slice(0, 1)}
                  </span>
                )}
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-white">{heroName}</span>
                  {winrateLabel ? (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                      Winrate {winrateLabel}
                      {winrateRankLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                      Winrate unavailable
                    </span>
                  )}
                </div>
              </div>
              <span className="font-semibold text-[var(--accent)]">Matches {matchesLabel}</span>
            </>
          );
        }

        const winRatePercent = formatPercent(entry.winrateValue) ?? '—';

        return (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[rgba(245,247,245,0.45)]">#{entry.rank}</span>
              {iconUrl ? (
                <Image
                  src={iconUrl}
                  alt={`${heroName} icon`}
                  width={28}
                  height={28}
                  sizes="28px"
                  className="h-7 w-7 object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center border border-[rgba(255,255,255,0.12)] text-[10px] uppercase text-[rgba(245,247,245,0.55)]">
                  {heroName.slice(0, 1)}
                </span>
              )}
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white">{heroName}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                  Matches {matchesLabel}
                </span>
              </div>
            </div>
            <span className="font-semibold text-[var(--accent)]">{winRatePercent}</span>
          </>
        );
      }}
      emptyMessage={
        mode === 'popularity' ? 'Hero popularity data unavailable.' : 'Hero winrate data unavailable.'
      }
      errorMessage="Failed to load hero stats. Try adjusting your filters."
    />
  );
}
