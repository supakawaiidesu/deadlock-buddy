import type { PlayerHeroStat } from '@/lib/api/schema';

export type PlayerHeroRow = {
  heroId: number;
  matches: number;
  wins: number;
  winRate: number;
  kda: number;
  networthPerMin: number;
  lastHitsPerMin: number;
  damagePerMin: number;
  lastPlayed: number;
};

export function buildHeroRows(stats: PlayerHeroStat[]): PlayerHeroRow[] {
  return stats.map((stat) => {
    const winRate = stat.matches_played > 0 ? stat.wins / stat.matches_played : 0;
    const kda =
      stat.deaths === 0
        ? stat.kills + stat.assists
        : (stat.kills + stat.assists) / stat.deaths;

    return {
      heroId: stat.hero_id,
      matches: stat.matches_played,
      wins: stat.wins,
      winRate,
      kda,
      networthPerMin: stat.networth_per_min,
      lastHitsPerMin: stat.last_hits_per_min,
      damagePerMin: stat.damage_per_min,
      lastPlayed: stat.last_played,
    };
  });
}

export function computeTopHeroes(rows: PlayerHeroRow[], limit = 5) {
  return [...rows]
    .sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      return b.winRate - a.winRate;
    })
    .slice(0, limit);
}

export function computeOverallRecord(rows: PlayerHeroRow[]) {
  const aggregates = rows.reduce(
    (acc, row) => {
      acc.matches += row.matches;
      acc.wins += row.wins;
      return acc;
    },
    { matches: 0, wins: 0 },
  );

  return {
    matches: aggregates.matches,
    wins: aggregates.wins,
    losses: Math.max(aggregates.matches - aggregates.wins, 0),
    winRate: aggregates.matches > 0 ? aggregates.wins / aggregates.matches : 0,
  };
}

