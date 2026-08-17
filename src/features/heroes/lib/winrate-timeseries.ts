import type { AnalyticsHeroStats } from '@/lib/api/schema';

export type HeroWinrateDatum = {
  heroId: number;
  time: number;
  wins: number;
  losses: number;
  matches: number;
};

export type HeroWinratePoint = {
  time: number;
  winrate: number;
  wins: number;
  losses: number;
  matches: number;
};

export type HeroWinrateSeries = {
  heroId: number;
  points: HeroWinratePoint[];
};

export function compactHeroWinrateRows(
  rows: readonly AnalyticsHeroStats[],
): HeroWinrateDatum[] {
  return rows.map((row) => ({
    heroId: row.hero_id,
    time: row.bucket,
    wins: row.wins,
    losses: row.losses,
    matches: row.matches,
  }));
}

export function buildHeroWinrateSeries(
  data: readonly HeroWinrateDatum[],
  selectedHeroIds: readonly number[],
): HeroWinrateSeries[] {
  return selectedHeroIds.map((heroId) => ({
    heroId,
    points: data
      .filter((datum) => datum.heroId === heroId && datum.matches > 0)
      .map(({ time, wins, losses, matches }) => ({
        time,
        winrate: wins / matches,
        wins,
        losses,
        matches,
      }))
      .sort((left, right) => left.time - right.time),
  }));
}
