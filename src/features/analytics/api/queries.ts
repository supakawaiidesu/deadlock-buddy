import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchGameStats, type GameStatsFilters } from '@/lib/api/analytics';

export function gameStatsQueryKey(filters: GameStatsFilters) {
  return [
    'analytics',
    'game-stats',
    'start_time_day',
    filters.minUnixTimestamp,
    filters.minAverageBadge,
    filters.maxAverageBadge,
  ] as const;
}

export function gameStatsQueryOptions(filters: GameStatsFilters) {
  return queryOptions({
    queryKey: gameStatsQueryKey(filters),
    queryFn: () => fetchGameStats(filters),
  });
}

export function useGameStats(filters: GameStatsFilters) {
  return useQuery(gameStatsQueryOptions(filters));
}
