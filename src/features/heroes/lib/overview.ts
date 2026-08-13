import { resolveHeroTier } from '@/features/heroes/hero-tier';
import type { HeroTier } from '@/features/heroes/hero-tier';
import type { HeroScoreboardEntry } from '@/lib/api/schema';
import { getHeroIconUrl } from '@/lib/data/heroes';
import type { HeroSummary } from '@/lib/data/heroes';

export type HeroOverviewRow = {
  heroId: number;
  name: string;
  iconUrl: string | null;
  tier: HeroTier | null;
  winrate?: number;
  pickRate?: number;
  matches?: number;
  players?: number;
};

export function buildHeroOverviewRows(
  summaries: readonly Pick<HeroSummary, 'id' | 'name'>[],
  winrateEntries: readonly HeroScoreboardEntry[],
  popularityEntries: readonly HeroScoreboardEntry[],
): HeroOverviewRow[] {
  const winrateByHeroId = new Map(
    winrateEntries.map((entry) => [entry.hero_id, entry] as const),
  );
  const popularityByHeroId = new Map(
    popularityEntries.map((entry) => [entry.hero_id, entry] as const),
  );
  const totalMatches = popularityEntries.reduce((sum, entry) => sum + entry.matches, 0);

  return summaries
    .map((summary) => {
      const winrateEntry = winrateByHeroId.get(summary.id);
      const popularityEntry = popularityByHeroId.get(summary.id);
      const winrate = winrateEntry?.value;
      const matches = popularityEntry?.matches ?? winrateEntry?.matches;
      const players = popularityEntry?.value;
      const pickRate =
        typeof matches === 'number' && totalMatches > 0 ? matches / totalMatches : undefined;

      return {
        heroId: summary.id,
        name: summary.name,
        iconUrl: getHeroIconUrl(summary.id),
        tier: resolveHeroTier(winrate),
        winrate,
        pickRate,
        matches,
        players,
      };
    })
    .filter((row) => (row.matches ?? 0) > 0);
}
