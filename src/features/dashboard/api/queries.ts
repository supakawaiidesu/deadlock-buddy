import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/lib/api/leaderboard';
import {
  fetchHeroWinrateLeaderboard,
  fetchHeroPopularityLeaderboard,
  fetchItemWinrateLeaderboard,
  fetchItemPopularityLeaderboard,
} from '@/lib/api/analytics';
import { fetchRankDistribution } from '@/lib/api/players';
import type { HeroScoreboardEntry, LeaderboardEntry, RankDistributionEntry } from '@/lib/api/schema';
import type { ItemWinrateEntry } from '@/lib/api/analytics';
import { heroSummaries } from '@/lib/data/heroes';
import type { DashboardDataBundle } from '@/features/dashboard/dashboard-types';
import type { HeroLeaderboardEntry } from '@/features/heroes/components/hero-leaderboard-panel';

const LEADERBOARD_REGION = 'NAmerica';
const DEFAULT_DISTRIBUTION_WINDOW_DAYS = 7;
const STALE_TIME = 60_000;

function buildDashboardData(
  leaderboardEntries: LeaderboardEntry[],
  heroWinrateEntries: HeroScoreboardEntry[],
  heroPopularityEntries: HeroScoreboardEntry[],
  itemWinrateEntries: ItemWinrateEntry[],
  itemPopularityEntries: ItemWinrateEntry[],
  rankDistributionEntries: RankDistributionEntry[],
  rankDistributionMinUnixTimestamp: number,
): DashboardDataBundle {
  const heroWinratePanelEntries: HeroLeaderboardEntry[] = heroWinrateEntries.map((entry) => ({
    ...entry,
    winrateRank: entry.rank,
    winrateValue: entry.value,
  }));

  const heroWinrateById = new Map(heroWinrateEntries.map((entry) => [entry.hero_id, entry] as const));
  const heroPopularityPanelEntries: HeroLeaderboardEntry[] = heroPopularityEntries.map((entry) => {
    const winrate = heroWinrateById.get(entry.hero_id);
    return {
      ...entry,
      winrateRank: winrate?.rank,
      winrateValue: winrate?.value,
    };
  });

  const heroCount = heroSummaries.length;
  const highestBadge = leaderboardEntries.reduce((acc, entry) => {
    if (typeof entry.badge_level === 'number') {
      return Math.max(acc, entry.badge_level);
    }
    return acc;
  }, 0);

  return {
    leaderboardEntries,
    heroWinrateEntries: heroWinratePanelEntries,
    heroPopularityEntries: heroPopularityPanelEntries,
    itemWinrateEntries,
    itemPopularityEntries,
    rankDistributionEntries,
    rankDistributionMinUnixTimestamp,
    heroCount,
    highestBadge,
  };
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardDataBundle> => {
      const nowUnix = Math.floor(Date.now() / 1000);
      const rankDistributionMinUnixTimestamp = nowUnix - DEFAULT_DISTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;

      const [
        leaderboard,
        heroWinrate,
        heroPopularity,
        itemWinrate,
        itemPopularity,
        rankDistribution,
      ] = await Promise.all([
        fetchLeaderboard(LEADERBOARD_REGION).then((data) => data.slice(0, 50)).catch(() => [] as LeaderboardEntry[]),
        fetchHeroWinrateLeaderboard().catch(() => [] as HeroScoreboardEntry[]),
        fetchHeroPopularityLeaderboard(50).catch(() => [] as HeroScoreboardEntry[]),
        fetchItemWinrateLeaderboard(50).catch(() => [] as ItemWinrateEntry[]),
        fetchItemPopularityLeaderboard(50).catch(() => [] as ItemWinrateEntry[]),
        fetchRankDistribution({ minUnixTimestamp: rankDistributionMinUnixTimestamp }).catch(() => [] as RankDistributionEntry[]),
      ]);

      return buildDashboardData(
        leaderboard,
        heroWinrate,
        heroPopularity,
        itemWinrate,
        itemPopularity,
        rankDistribution,
        rankDistributionMinUnixTimestamp,
      );
    },
    staleTime: STALE_TIME,
  });
}
