import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPlayerHeroStats,
  fetchPlayerMMR,
  fetchPlayerMMRHistory,
} from '@/lib/api/players';

export const playerQueryKeys = {
  base: ['player'],
  heroStats: (accountId: number) => ['player', accountId, 'hero-stats'] as const,
  overview: (accountId: number) => ['player', accountId, 'overview'] as const,
  mmrHistory: (accountId: number) => ['player', accountId, 'mmr-history'] as const,
};

export function usePlayerHeroStats(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.heroStats(accountId),
    queryFn: () => fetchPlayerHeroStats(accountId),
    enabled: accountId > 0,
  });
}

export function usePlayerOverview(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.overview(accountId),
    queryFn: () => fetchPlayerMMR(accountId),
    enabled: accountId > 0,
  });
}

export function usePlayerMMRHistory(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.mmrHistory(accountId),
    queryFn: () => fetchPlayerMMRHistory(accountId),
    enabled: accountId > 0,
    select: (entries) => {
      const filtered = entries.filter(
        (entry) =>
          typeof entry.player_score === 'number' && typeof entry.start_time === 'number',
      );
      const sorted = [...filtered].sort((a, b) => a.start_time - b.start_time);

      return sorted.map((entry, index) => {
        const previous = index > 0 ? sorted[index - 1] : null;
        const delta = previous
          ? entry.player_score - (previous?.player_score ?? entry.player_score)
          : 0;

        return {
          ...entry,
          delta,
        };
      });
    },
  });
}

export function usePlayerHealth(accountId: number) {
  const { data: overview } = usePlayerOverview(accountId);
  const { data: heroStats } = usePlayerHeroStats(accountId);

  return useMemo(() => {
    if (!overview || !heroStats) return null;

    const matchesPlayed = heroStats.reduce((sum, stat) => sum + stat.matches_played, 0);
    const wins = heroStats.reduce((sum, stat) => sum + stat.wins, 0);
    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

    return {
      matchesPlayed,
      wins,
      winRate,
    };
  }, [overview, heroStats]);
}
