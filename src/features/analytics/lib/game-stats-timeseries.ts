import type { AnalyticsGameStats } from '@/lib/api/schema';

export type GameStatsMetric = Exclude<keyof AnalyticsGameStats, 'bucket'>;

export type GameStatsTimeSeriesPoint = {
  time: number;
  value: number;
};
export function findGameStatsSeriesBaseline(
  points: readonly GameStatsTimeSeriesPoint[],
  minTime: number,
): number | null {
  for (const point of points) {
    if (point.time >= minTime) return point.value;
  }
  return null;
}

export function calculatePercentageChange(value: number, baseline: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return null;
  return ((value - baseline) / Math.abs(baseline)) * 100;
}


export function buildGameStatsMetricSeries(
  rows: readonly AnalyticsGameStats[],
  metric: GameStatsMetric,
): GameStatsTimeSeriesPoint[] {
  const valuesByTime = new Map<number, number>();

  for (const row of rows) {
    valuesByTime.set(row.bucket, row[metric]);
  }

  return Array.from(valuesByTime, ([time, value]) => ({ time, value }))
    .sort((left, right) => left.time - right.time);
}
