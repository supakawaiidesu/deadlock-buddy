import { Panel } from '@/ui/panel';
import {
  fetchHeroPopularityLeaderboard,
  fetchHeroWinrateLeaderboard,
} from '@/lib/api/analytics';
import type { HeroScoreboardEntry } from '@/lib/api/schema';
import { getHeroIconUrl, heroSummaries } from '@/lib/data/heroes';
import type { HeroOverviewRow } from '@/features/heroes/components/hero-overview-table';
import { HeroOverviewTable } from '@/features/heroes/components/hero-overview-table';
import { resolveHeroTier } from '@/features/heroes/hero-tier';

async function getHeroWinrateSample(): Promise<HeroScoreboardEntry[]> {
  try {
    return await fetchHeroWinrateLeaderboard();
  } catch (error) {
    console.error('Failed to load hero winrate leaderboard', error);
    return [];
  }
}

async function getHeroPopularitySample(): Promise<HeroScoreboardEntry[]> {
  try {
    return await fetchHeroPopularityLeaderboard();
  } catch (error) {
    console.error('Failed to load hero popularity leaderboard', error);
    return [];
  }
}

export default async function HeroesPage() {
  const [winrateRaw, popularityRaw] = await Promise.all([
    getHeroWinrateSample(),
    getHeroPopularitySample(),
  ]);

  const winrateByHeroId = new Map(winrateRaw.map((entry) => [entry.hero_id, entry] as const));
  const popularityByHeroId = new Map(popularityRaw.map((entry) => [entry.hero_id, entry] as const));
  const totalMatches = popularityRaw.reduce((sum, entry) => sum + entry.matches, 0);

  const rows: HeroOverviewRow[] = heroSummaries
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
        slug: summary.slug,
        iconUrl: getHeroIconUrl(summary.id),
        tier: resolveHeroTier(winrate),
        winrate,
        pickRate,
        matches,
        players,
      };
    })
    .filter((row) => (row.matches ?? 0) > 0);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-[rgba(245,247,245,0.6)]">
        <div className="flex items-center gap-3 text-white">
          <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.5)]">
            Heroes terminal
          </span>
          <span className="hidden text-[rgba(245,247,245,0.45)] sm:inline-flex">·</span>
          <span className="text-[rgba(245,247,245,0.7)]">Meta filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ label: 'Patch', value: '10.09.24' }, { label: 'Queue', value: 'Ranked' }, { label: 'Region', value: 'Global' }, { label: 'Sample', value: 'Live' }, { label: 'Role', value: 'All' }].map((filter) => (
            <button
              key={filter.label}
              type="button"
              className="border border-[rgba(245,247,245,0.12)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[rgba(245,247,245,0.6)] transition hover:border-[var(--accent)] hover:text-white"
            >
              {filter.label}: {filter.value}
            </button>
          ))}
          <button
            type="button"
            className="border border-[var(--accent)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-black"
          >
            Reset
          </button>
        </div>
      </Panel>

      <Panel className="flex flex-col !p-0">
        <HeroOverviewTable rows={rows} />
      </Panel>
    </div>
  );
}
