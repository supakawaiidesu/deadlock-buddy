import { createFileRoute } from '@tanstack/react-router';
import { Panel } from '@/ui/panel';
import { getHeroIconUrl, heroSummaries } from '@/lib/data/heroes';
import type { HeroOverviewRow } from '@/features/heroes/components/hero-overview-table';
import { HeroOverviewTable } from '@/features/heroes/components/hero-overview-table';
import { resolveHeroTier } from '@/features/heroes/hero-tier';
import { useHeroOverviewData } from '@/features/heroes/api/queries';
import { Skeleton } from '@/ui/skeleton';
import { useMemo } from 'react';

export const Route = createFileRoute('/heroes/')({
  component: HeroesPage,
});

function HeroesPage() {
  const { data, isLoading, isError } = useHeroOverviewData();

  const rows: HeroOverviewRow[] = useMemo(() => {
    if (!data) return [];

    const { winrateRaw, popularityRaw } = data;
    const winrateByHeroId = new Map(winrateRaw.map((entry) => [entry.hero_id, entry] as const));
    const popularityByHeroId = new Map(popularityRaw.map((entry) => [entry.hero_id, entry] as const));
    const totalMatches = popularityRaw.reduce((sum, entry) => sum + entry.matches, 0);

    return heroSummaries
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
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          Error
        </span>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">Failed to load hero data.</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-[rgb(var(--text-rgb)/0.6)]">
        <div className="flex items-center gap-3 text-[var(--text-strong)]">
          <span className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--text-rgb)/0.5)]">
            Heroes terminal
          </span>
          <span className="hidden text-[rgb(var(--text-rgb)/0.45)] sm:inline-flex">·</span>
          <span className="text-[rgb(var(--text-rgb)/0.7)]">Meta filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ label: 'Patch', value: '10.09.24' }, { label: 'Queue', value: 'Ranked' }, { label: 'Region', value: 'Global' }, { label: 'Sample', value: 'Live' }, { label: 'Role', value: 'All' }].map((filter) => (
            <button
              key={filter.label}
              type="button"
              className="border border-[rgb(var(--text-rgb)/0.12)] bg-[rgb(var(--neutral-rgb)/0.02)] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[rgb(var(--text-rgb)/0.6)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)]"
            >
              {filter.label}: {filter.value}
            </button>
          ))}
          <button
            type="button"
            className="border border-[var(--accent)] bg-[rgb(var(--neutral-rgb)/0.02)] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]"
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
