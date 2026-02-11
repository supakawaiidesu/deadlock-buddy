import { useQuery } from '@tanstack/react-query';
import {
  fetchHeroPopularityLeaderboard,
  fetchHeroStats,
  fetchHeroWinrateLeaderboard,
} from '@/lib/api/analytics';
import type { HeroScoreboardEntry, HeroStatsEntry } from '@/lib/api/schema';

const STALE_TIME = 60_000;

export function useHeroOverviewData() {
  return useQuery({
    queryKey: ['heroes', 'overview'],
    queryFn: async () => {
      const [winrateRaw, popularityRaw] = await Promise.all([
        fetchHeroWinrateLeaderboard(),
        fetchHeroPopularityLeaderboard(),
      ]);
      return { winrateRaw, popularityRaw };
    },
    staleTime: STALE_TIME,
  });
}

export function useHeroDetail(heroId: number) {
  return useQuery<HeroStatsEntry[]>({
    queryKey: ['heroes', 'stats', heroId],
    queryFn: () => fetchHeroStats(),
    staleTime: STALE_TIME,
  });
}
