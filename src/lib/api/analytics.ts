import { apiRequest } from './client';
import { HeroScoreboardResponseSchema } from './schema';

export type HeroScoreboardParams = {
  readonly sortBy?: 'winrate' | 'matches' | string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly limit?: number;
};

export async function fetchHeroScoreboard(params: HeroScoreboardParams = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/scoreboards/heroes',
    searchParams: {
      sort_by: params.sortBy,
      sort_direction: params.sortDirection,
      limit: params.limit,
    },
  });

  return HeroScoreboardResponseSchema.parse(result);
}

export async function fetchHeroWinrateLeaderboard(limit?: number) {
  const entries = await fetchHeroScoreboard({
    sortBy: 'winrate',
    sortDirection: 'desc',
    limit,
  });

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}
