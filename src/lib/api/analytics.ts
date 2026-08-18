import { apiRequest } from './client';
import {
  AnalyticsGameStatsResponseSchema,
  AnalyticsHeroStatsResponseSchema,
  BadgeDistributionResponseSchema,
  HeroScoreboardResponseSchema,
  ItemStatsResponseSchema,
  type AnalyticsGameStats,
  type AnalyticsHeroStats,
  type ItemStatsEntry,
} from './schema';

export type DateRangeFilters = {
  readonly minUnixTimestamp?: number;
  readonly maxUnixTimestamp?: number;
};

export type HeroScoreboardParams = {
  readonly sortBy?: 'winrate' | 'matches' | string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly limit?: number;
} & DateRangeFilters;

export type HeroScoreboardFilters = DateRangeFilters;

export type HeroStatsBucket = 'start_time_day';

export type HeroStatsFilters = {
  readonly minUnixTimestamp: number;
  readonly minAverageBadge: number;
  readonly maxAverageBadge: number;
};

export async function fetchHeroStats(
  filters: HeroStatsFilters,
): Promise<AnalyticsHeroStats[]> {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/hero-stats',
    searchParams: {
      bucket: 'start_time_day' satisfies HeroStatsBucket,
      game_mode: 'normal',
      match_mode: 'ranked,unranked',
      min_unix_timestamp: filters.minUnixTimestamp,
      min_average_badge: filters.minAverageBadge,
      max_average_badge: filters.maxAverageBadge,
      min_hero_matches: 0,
      min_hero_matches_total: 0,
    },
  });

  return AnalyticsHeroStatsResponseSchema.parse(result);
}

export type GameStatsBucket = 'start_time_day';

export type GameStatsFilters = {
  readonly minUnixTimestamp: number;
  readonly minAverageBadge: number;
  readonly maxAverageBadge: number;
};

export async function fetchGameStats(
  filters: GameStatsFilters,
): Promise<AnalyticsGameStats[]> {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/game-stats',
    searchParams: {
      bucket: 'start_time_day' satisfies GameStatsBucket,
      game_mode: 'normal',
      match_mode: 'ranked,unranked',
      min_unix_timestamp: filters.minUnixTimestamp,
      min_average_badge: filters.minAverageBadge,
      max_average_badge: filters.maxAverageBadge,
    },
  });

  return AnalyticsGameStatsResponseSchema.parse(result);
}

export async function fetchHeroScoreboard(params: HeroScoreboardParams = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/scoreboards/heroes',
    searchParams: {
      sort_by: params.sortBy,
      sort_direction: params.sortDirection,
      limit: params.limit,
      min_unix_timestamp: params.minUnixTimestamp,
      max_unix_timestamp: params.maxUnixTimestamp,
    },
  });

  return HeroScoreboardResponseSchema.parse(result);
}

export async function fetchHeroWinrateLeaderboard(
  limit?: number,
  filters?: HeroScoreboardFilters,
) {
  const entries = await fetchHeroScoreboard({
    sortBy: 'winrate',
    sortDirection: 'desc',
    limit,
    minUnixTimestamp: filters?.minUnixTimestamp,
    maxUnixTimestamp: filters?.maxUnixTimestamp,
  });

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}

export async function fetchHeroPopularityLeaderboard(
  limit?: number,
  filters?: HeroScoreboardFilters,
) {
  const entries = await fetchHeroScoreboard({
    sortBy: 'matches',
    sortDirection: 'desc',
    limit,
    minUnixTimestamp: filters?.minUnixTimestamp,
    maxUnixTimestamp: filters?.maxUnixTimestamp,
  });

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}

export type ItemStatsFilters = DateRangeFilters;

export async function fetchItemStats(filters: ItemStatsFilters = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/item-stats',
    searchParams: {
      min_unix_timestamp: filters.minUnixTimestamp,
      max_unix_timestamp: filters.maxUnixTimestamp,
    },
  });

  return ItemStatsResponseSchema.parse(result);
}

export type ItemWinrateEntry = {
  rank: number;
  itemId: number;
  wins: number;
  losses?: number;
  matches: number;
  players?: number;
  winrate: number;
  bucket?: number;
};

type ItemLeaderboardEntry = Omit<ItemWinrateEntry, 'rank'>;

function computeMatches(entry: ItemStatsEntry): number {
  const wins = typeof entry.wins === 'number' ? entry.wins : 0;
  const losses = typeof entry.losses === 'number' ? entry.losses : null;
  const matchesField = typeof entry.matches === 'number' ? entry.matches : null;

  if (matchesField && matchesField > 0) {
    return matchesField;
  }

  if (losses !== null) {
    const total = wins + losses;
    return total > 0 ? total : 0;
  }

  return wins;
}

export function computeItemWinrate(entry: ItemStatsEntry): number {
  const wins = typeof entry.wins === 'number' ? entry.wins : 0;
  const matches = computeMatches(entry);
  if (matches <= 0) return 0;
  return wins / matches;
}

function buildItemLeaderboardEntries(stats: ItemStatsEntry[]): ItemLeaderboardEntry[] {
  return stats
    .map((entry) => {
      const wins = typeof entry.wins === 'number' ? entry.wins : 0;
      const losses = typeof entry.losses === 'number' ? entry.losses : undefined;
      const matches = computeMatches(entry);
      const winrate = matches > 0 ? wins / matches : 0;

      return {
        itemId: entry.item_id,
        wins,
        losses,
        matches,
        players: typeof entry.players === 'number' ? entry.players : undefined,
        bucket: typeof entry.bucket === 'number' ? entry.bucket : undefined,
        winrate,
      };
    })
    .filter((entry) => entry.matches > 0);
}

function rankItemEntries(
  entries: ItemLeaderboardEntry[],
  compareFn: (a: ItemLeaderboardEntry, b: ItemLeaderboardEntry) => number,
): ItemWinrateEntry[] {
  return [...entries]
    .sort(compareFn)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}

export async function fetchItemWinrateLeaderboard(
  limit?: number,
  filters?: ItemStatsFilters,
): Promise<ItemWinrateEntry[]> {
  const stats = await fetchItemStats(filters);

  const ranked = rankItemEntries(buildItemLeaderboardEntries(stats), (a, b) => {
    if (b.winrate !== a.winrate) {
      return b.winrate - a.winrate;
    }
    if (b.matches !== a.matches) {
      return b.matches - a.matches;
    }
    return b.wins - a.wins;
  });

  if (typeof limit === 'number') {
    return ranked.slice(0, limit);
  }

  return ranked;
}

export async function fetchItemPopularityLeaderboard(
  limit?: number,
  filters?: ItemStatsFilters,
): Promise<ItemWinrateEntry[]> {
  const stats = await fetchItemStats(filters);

  const ranked = rankItemEntries(buildItemLeaderboardEntries(stats), (a, b) => {
    if (b.matches !== a.matches) {
      return b.matches - a.matches;
    }
    if (b.winrate !== a.winrate) {
      return b.winrate - a.winrate;
    }
    return b.wins - a.wins;
  });

  if (typeof limit === 'number') {
    return ranked.slice(0, limit);
  }

  return ranked;
}

export type BadgeDistributionFilters = DateRangeFilters;

export async function fetchBadgeDistribution(filters: BadgeDistributionFilters = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/badge-distribution',
    searchParams: {
      min_unix_timestamp: filters.minUnixTimestamp,
      max_unix_timestamp: filters.maxUnixTimestamp,
    },
  });

  return BadgeDistributionResponseSchema.parse(result);
}

