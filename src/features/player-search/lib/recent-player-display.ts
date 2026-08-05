import { buildHeroRows, computeTopHeroes } from '@/features/players/lib/metrics';
import type { PlayerHeroStat } from '@/lib/api/schema';

export const RECENT_PLAYER_NAME_MAX_LENGTH = 20;

export function truncateRecentPlayerName(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > RECENT_PLAYER_NAME_MAX_LENGTH
    ? `${trimmed.slice(0, RECENT_PLAYER_NAME_MAX_LENGTH)}...`
    : trimmed;
}

export function getRecentTopHeroIds(stats: readonly PlayerHeroStat[]): number[] {
  return computeTopHeroes(buildHeroRows([...stats]), 3).map((hero) => hero.heroId);
}
