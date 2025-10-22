import { apiRequest } from './client';
import {
  HeroScoreboardResponseSchema,
  ItemStatsResponseSchema,
  type ItemStatsEntry,
} from './schema';

export type HeroScoreboardParams = {
  readonly sortBy?: 'winrate' | 'matches' | string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly limit?: number;
};

export async function fetchHeroScoreboard(params: HeroScoreboardParams = {}) {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/scoreboards/heroes',
    searchParams: {
      sort_by: params.sortBy,
      sort_direction: params.sortDirection,
      limit: params.limit,
    },
  });

  return HeroScoreboardResponseSchema.parse(result);
}

export async function fetchHeroWinrateLeaderboard(limit?: number) {
  const entries = await fetchHeroScoreboard({
    sortBy: 'winrate',
    sortDirection: 'desc',
    limit,
  });

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}

export async function fetchHeroPopularityLeaderboard(limit?: number) {
  const entries = await fetchHeroScoreboard({
    sortBy: 'matches',
    sortDirection: 'desc',
    limit,
  });

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}

export async function fetchItemStats() {
  const result = await apiRequest<unknown>({
    path: '/v1/analytics/item-stats',
  });

  return ItemStatsResponseSchema.parse(result);
}

export type ItemWinrateEntry = {
  rank: number;
  itemId: number;
  wins: number;
  losses?: number;
  matches: number;
  players?: number;
  winrate: number;
  bucket?: number;
};

function computeMatches(entry: ItemStatsEntry): number {
  const wins = typeof entry.wins === 'number' ? entry.wins : 0;
  const losses = typeof entry.losses === 'number' ? entry.losses : null;
  const matchesField = typeof entry.matches === 'number' ? entry.matches : null;

  if (matchesField && matchesField > 0) {
    return matchesField;
  }

  if (losses !== null) {
    const total = wins + losses;
    return total > 0 ? total : 0;
  }

  return wins;
}

export function computeItemWinrate(entry: ItemStatsEntry): number {
  const wins = typeof entry.wins === 'number' ? entry.wins : 0;
  const matches = computeMatches(entry);
  if (matches <= 0) return 0;
  return wins / matches;
}

export async function fetchItemWinrateLeaderboard(limit?: number): Promise<ItemWinrateEntry[]> {
  const stats = await fetchItemStats();

  const ranked = stats
    .map((entry) => {
      const wins = typeof entry.wins === 'number' ? entry.wins : 0;
      const losses = typeof entry.losses === 'number' ? entry.losses : undefined;
      const matches = computeMatches(entry);
      const winrate = matches > 0 ? wins / matches : 0;

      return {
        itemId: entry.item_id,
        wins,
        losses,
        matches,
        players: typeof entry.players === 'number' ? entry.players : undefined,
        bucket: typeof entry.bucket === 'number' ? entry.bucket : undefined,
        winrate,
      };
    })
    .filter((entry) => entry.matches > 0)
    .sort((a, b) => {
      if (b.winrate !== a.winrate) {
        return b.winrate - a.winrate;
      }
      if (b.matches !== a.matches) {
        return b.matches - a.matches;
      }
      return b.wins - a.wins;
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

  if (typeof limit === 'number') {
    return ranked.slice(0, limit);
  }

  return ranked;
}
