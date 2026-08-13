import { useQuery } from '@tanstack/react-query';
import {
  fetchHeroPopularityLeaderboard,
  fetchHeroWinrateLeaderboard,
} from '@/lib/api/analytics';

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
