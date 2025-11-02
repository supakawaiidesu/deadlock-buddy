import { apiRequest } from './client';
import {
  PlayerHeroStatsResponseSchema,
  PlayerMMRHistoryResponseSchema,
  PlayerMMRResponseSchema,
  RankDistributionResponseSchema,
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

export async function fetchPlayerMMR(accountId: number) {
  const result = await apiRequest<unknown>({
    path: '/v1/players/mmr',
    searchParams: {
      account_ids: accountId,
    },
  });

  const parsed = PlayerMMRResponseSchema.parse(result);
  return parsed[0] ?? null;
}

export async function fetchPlayerMMRHistory(accountId: number, heroId?: number) {
  const result = await apiRequest<unknown>({
    path: heroId
      ? `/v1/players/${accountId}/mmr-history/${heroId}`
      : `/v1/players/${accountId}/mmr-history`,
  });

  return PlayerMMRHistoryResponseSchema.parse(result);
}

export type RankDistributionFilters = {
  readonly minUnixTimestamp?: number;
  readonly maxUnixTimestamp?: number;
};

export async function fetchRankDistribution(filters: RankDistributionFilters = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/players/mmr/distribution',
    searchParams: {
      min_unix_timestamp: filters.minUnixTimestamp,
      max_unix_timestamp: filters.maxUnixTimestamp,
    },
  });

  return RankDistributionResponseSchema.parse(result);
}
