import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMatchMetadata, MATCH_METADATA_PAGE_SIZE } from '@/lib/api/matches';
import { fetchPlayerHeroStats, fetchPlayerMatchHistory, fetchPlayerMMR, fetchPlayerMMRHistory, fetchPlayerRank, fetchPlayerSteamProfiles } from '@/lib/api/players';
import { fetchSteamProfile, hasSteamService } from '@/lib/api/steam';
import type { PlayerSteamProfile } from '@/lib/api/schema';

export const playerQueryKeys = {
  base: ['player'],
  heroStats: (accountId: number) => ['player', accountId, 'hero-stats'] as const,
  overview: (accountId: number) => ['player', accountId, 'overview'] as const,
  mmrHistory: (accountId: number) => ['player', accountId, 'mmr-history'] as const,
  rank: (accountId: number) => ['player', accountId, 'rank'] as const,
  matchHistory: (accountId: number) => ['player', accountId, 'match-history'] as const,
  matchMetadata: (accountId: number, historySignature: string) =>
    ['player', accountId, 'match-metadata', historySignature] as const,
  steamProfile: (accountId: number) => ['player', accountId, 'steam-profile'] as const,
  steamName: (accountId: number) => ['player', 'steam-name', accountId] as const,
  steamNames: (accountIds: readonly number[]) => ['player', 'steam-names', accountIds] as const,
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

/** Current ranked badge (tier + sub-rank) for the identity row. */
export function usePlayerRank(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.rank(accountId),
    queryFn: () => fetchPlayerRank(accountId),
    enabled: accountId > 0,
  });
}

export function usePlayerMatchHistory(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.matchHistory(accountId),
    queryFn: () => fetchPlayerMatchHistory(accountId),
    enabled: accountId > 0,
  });
}

export function usePlayerMatchHistoryFeed(accountId: number) {
  const historyQuery = usePlayerMatchHistory(accountId);
  const matches = historyQuery.data ?? [];
  const historySignature = useMemo(
    () => matches.map((match) => match.match_id).join(','),
    [matches],
  );

  const metadataQuery = useInfiniteQuery({
    queryKey: playerQueryKeys.matchMetadata(accountId, historySignature),
    queryFn: ({ pageParam }) => {
      const pageMatches = matches.slice(
        pageParam * MATCH_METADATA_PAGE_SIZE,
        (pageParam + 1) * MATCH_METADATA_PAGE_SIZE,
      );

      return fetchMatchMetadata(pageMatches.map((match) => match.match_id));
    },
    initialPageParam: 0,
    enabled: accountId > 0 && matches.length > 0,
    getNextPageParam: (_lastPage, _allPages, lastPageParam) => {
      const nextPage = lastPageParam + 1;
      return nextPage * MATCH_METADATA_PAGE_SIZE < matches.length ? nextPage : undefined;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const metadata = metadataQuery.data?.pages.flat() ?? [];
  const loadedPageCount = metadataQuery.data?.pages.length ?? 0;
  const visibleMatchCount =
    metadataQuery.isError && loadedPageCount === 0
      ? Math.min(matches.length, MATCH_METADATA_PAGE_SIZE)
      : Math.min(matches.length, loadedPageCount * MATCH_METADATA_PAGE_SIZE);

  return {
    historyQuery,
    metadataQuery,
    matches,
    metadata,
    visibleMatches: matches.slice(0, visibleMatchCount),
    hasMore: visibleMatchCount < matches.length,
    isLoading:
      historyQuery.isLoading ||
      (matches.length > 0 && metadataQuery.isLoading && !metadataQuery.data),
  };
}

const STEAM_NAMES_CACHE_TIME = 10 * 60 * 1000;
const STEAM_NAMES_BATCH_SIZE = 100;

export function usePlayerSteamProfiles(accountIds: readonly number[]) {
  const queryClient = useQueryClient();
  const normalizedIds = useMemo(
    () =>
      Array.from(
        new Set(accountIds.filter((accountId) => Number.isInteger(accountId) && accountId > 0)),
      ).sort((a, b) => a - b),
    [accountIds],
  );

  return useQuery({
    queryKey: playerQueryKeys.steamNames(normalizedIds),
    enabled: normalizedIds.length > 0,
    queryFn: async () => {
      const now = Date.now();
      const profiles: Record<string, PlayerSteamProfile> = {};
      const missingIds: number[] = [];

      for (const accountId of normalizedIds) {
        const state = queryClient.getQueryState<PlayerSteamProfile | null>(
          playerQueryKeys.steamName(accountId),
        );
        if (state && now - state.dataUpdatedAt < STEAM_NAMES_CACHE_TIME) {
          if (state.data) profiles[String(accountId)] = state.data;
          continue;
        }
        missingIds.push(accountId);
      }

      const batches: number[][] = [];
      for (let index = 0; index < missingIds.length; index += STEAM_NAMES_BATCH_SIZE) {
        batches.push(missingIds.slice(index, index + STEAM_NAMES_BATCH_SIZE));
      }

      const results = await Promise.allSettled(
        batches.map((batch) => fetchPlayerSteamProfiles(batch)),
      );

      results.forEach((result, batchIndex) => {
        if (result.status !== 'fulfilled') return;

        const profilesById = new Map(
          result.value.map((profile) => [profile.account_id, profile]),
        );
        for (const accountId of batches[batchIndex]) {
          const profile = profilesById.get(accountId) ?? null;
          queryClient.setQueryData(playerQueryKeys.steamName(accountId), profile);
          if (profile) profiles[String(accountId)] = profile;
        }
      });

      return profiles;
    },
    staleTime: STEAM_NAMES_CACHE_TIME,
    gcTime: STEAM_NAMES_CACHE_TIME,
  });
}

/**
 * Steam identity (persona, avatar, creation date, ban posture).
 *
 * Stays disabled when `VITE_STEAM_API_BASE` is unset so the profile page still
 * renders without the identity service. Unlike the dashboard queries, a failure
 * here is surfaced rather than degraded to an empty result: the panel must be
 * able to tell "clean" apart from "unchecked".
 */
export function useSteamProfile(accountId: number) {
  return useQuery({
    queryKey: playerQueryKeys.steamProfile(accountId),
    queryFn: () => fetchSteamProfile(accountId),
    enabled: accountId > 0 && hasSteamService,
    staleTime: 60 * 60 * 1000,
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
