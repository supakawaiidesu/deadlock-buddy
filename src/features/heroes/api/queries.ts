import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchHeroPopularityLeaderboard,
  fetchHeroStats,
  fetchHeroWinrateLeaderboard,
  type HeroStatsFilters,
} from '@/lib/api/analytics';
import type { HeroWinrateOverTimeSettings } from '@/features/dashboard/dashboard-types';
import {
  buildHeroWinrateSeries,
  compactHeroWinrateRows,
} from '@/features/heroes/lib/winrate-timeseries';

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

export function heroWinrateTimeSeriesQueryKey(filters: HeroStatsFilters) {
  return [
    'heroes',
    'winrate-over-time',
    'start_time_day',
    filters.minUnixTimestamp,
    filters.minAverageBadge,
    filters.maxAverageBadge,
  ] as const;
}

export function useHeroWinrateTimeSeries(settings: HeroWinrateOverTimeSettings) {
  const filters: HeroStatsFilters = {
    minUnixTimestamp: settings.minUnixTimestamp,
    minAverageBadge: settings.minAverageBadge,
    maxAverageBadge: settings.maxAverageBadge,
  };
  const selectSeries = useCallback(
    (data: Parameters<typeof buildHeroWinrateSeries>[0]) =>
      buildHeroWinrateSeries(data, settings.heroIds),
    [settings.heroIds],
  );

  return useQuery({
    queryKey: heroWinrateTimeSeriesQueryKey(filters),
    queryFn: async () => compactHeroWinrateRows(await fetchHeroStats(filters)),
    select: selectSeries,
  });
}
