import { apiRequest } from './client';
import { LeaderboardEntryResponseSchema } from './schema';

export async function fetchLeaderboard(region: string) {
  const result = await apiRequest<unknown>({
    path: `/v1/leaderboard/${region}`,
  });

  const parsed = LeaderboardEntryResponseSchema.parse(result);
  return parsed;
}

