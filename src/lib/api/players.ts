import { apiRequest } from './client';
import {
  PlayerHeroStatsResponseSchema,
  PlayerMatchHistoryResponseSchema,
  PlayerRankSchema,
  PlayerSteamProfilesResponseSchema,
  PlayerSteamSearchResponseSchema,
  type PlayerSteamSearchResponse,
} from './schema';

export async function fetchPlayerHeroStats(accountId: number) {
  const result = await apiRequest<unknown>({
    path: '/v1/players/hero-stats',
    searchParams: {
      account_ids: accountId,
    },
  });

  return PlayerHeroStatsResponseSchema.parse(result);
}

export async function fetchPlayerRank(accountId: number) {
  const result = await apiRequest<unknown>({
    path: `/v1/players/${accountId}/rank`,
  });

  return PlayerRankSchema.parse(result);
}

export async function fetchPlayerMatchHistory(accountId: number) {
  const result = await apiRequest<unknown>({
    path: `/v1/players/${accountId}/match-history`,
  });

  return PlayerMatchHistoryResponseSchema.parse(result);
}

/**
 * Fetch Steam persona names for a batch of Deadlock account IDs.
 *
 * The endpoint may omit accounts it cannot resolve and does not guarantee
 * response order, so callers should index the result by `account_id`.
 */
export async function fetchPlayerSteamProfiles(accountIds: readonly number[]) {
  const ids = Array.from(
    new Set(accountIds.filter((accountId) => Number.isInteger(accountId) && accountId > 0)),
  );
  if (ids.length === 0) return [];

  const result = await apiRequest<unknown>({
    path: '/v1/players/steam',
    searchParams: {
      account_ids: ids,
    },
  });

  return PlayerSteamProfilesResponseSchema.parse(result);
}

export async function fetchPlayerSteamSearch(
  query: string,
  signal?: AbortSignal,
): Promise<PlayerSteamSearchResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const result = await apiRequest<unknown>({
    path: '/v1/players/steam-search',
    searchParams: {
      search_query: trimmedQuery,
      min_matches_played_last_30d: 2,
    },
    init: { signal },
  });

  return PlayerSteamSearchResponseSchema.parse(result);
}

