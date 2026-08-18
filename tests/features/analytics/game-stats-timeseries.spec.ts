import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameStatsQueryOptions } from '@/features/analytics/api/queries';
import { buildGameStatsMetricSeries } from '@/features/analytics/lib/game-stats-timeseries';
import { analyticsGameStatsRow } from '../../fixtures/analytics-game-stats';

const filters = {
  minUnixTimestamp: 1_785_430_800,
  minAverageBadge: 0,
  maxAverageBadge: 116,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildGameStatsMetricSeries', () => {
  it('deduplicates by last row, retains zero, sorts, and does not mutate input', () => {
    const rows = [
      { ...analyticsGameStatsRow, bucket: 30, total_matches: 3 },
      { ...analyticsGameStatsRow, bucket: 10, total_matches: 0 },
      { ...analyticsGameStatsRow, bucket: 20, total_matches: 2 },
      { ...analyticsGameStatsRow, bucket: 30, total_matches: 4 },
    ];
    const before = structuredClone(rows);

    expect(buildGameStatsMetricSeries(rows, 'total_matches')).toEqual([
      { time: 10, value: 0 },
      { time: 20, value: 2 },
      { time: 30, value: 4 },
    ]);
    expect(rows).toEqual(before);
  });

  it('shares one complete cached response across metric projections', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([analyticsGameStatsRow]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchStub);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    });

    try {
      const first = await queryClient.ensureQueryData(gameStatsQueryOptions(filters));
      const second = await queryClient.ensureQueryData(gameStatsQueryOptions(filters));

      expect(fetchStub).toHaveBeenCalledOnce();
      expect(first).toEqual([analyticsGameStatsRow]);
      expect(second).toEqual(first);
      expect(first[0]).toMatchObject({
        total_matches: analyticsGameStatsRow.total_matches,
        avg_kills: analyticsGameStatsRow.avg_kills,
        team1_wins: analyticsGameStatsRow.team1_wins,
      });
      expect(buildGameStatsMetricSeries(first, 'total_matches')).toEqual([{
        time: analyticsGameStatsRow.bucket,
        value: analyticsGameStatsRow.total_matches,
      }]);
      expect(buildGameStatsMetricSeries(first, 'avg_kills')).toEqual([{
        time: analyticsGameStatsRow.bucket,
        value: analyticsGameStatsRow.avg_kills,
      }]);
      expect(fetchStub).toHaveBeenCalledOnce();
    } finally {
      queryClient.clear();
    }
  });
});
