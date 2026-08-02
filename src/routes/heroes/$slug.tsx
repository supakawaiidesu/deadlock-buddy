import { createFileRoute } from '@tanstack/react-router';
import { getHeroIconUrl, getHeroSummary, getHeroSummaryBySlug } from '@/lib/data/heroes';
import { HeroAverageStatsPanel } from '@/features/heroes/components/hero-average-stats-panel';
import type { HeroAverageStat } from '@/features/heroes/components/hero-average-stats-panel';
import { HeroDetailHeader } from '@/features/heroes/components/hero-detail-header';
import { resolveHeroTier } from '@/features/heroes/hero-tier';
import { useHeroDetail } from '@/features/heroes/api/queries';
import { Skeleton } from '@/ui/skeleton';
import { useMemo } from 'react';

export const Route = createFileRoute('/heroes/$slug')({
  component: HeroDetailPage,
});

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
}

function formatAverage(value?: number, options: { decimals?: number } = {}): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '\u2014';
  const decimals = options.decimals ?? 1;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatWholeNumber(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '\u2014';
  return Math.round(value).toLocaleString();
}

function HeroDetailPage() {
  const { slug } = Route.useParams();
  const normalizedSlug = slug.toLowerCase();

  let heroSummary = getHeroSummaryBySlug(normalizedSlug);

  if (!heroSummary) {
    const heroId = Number.parseInt(normalizedSlug, 10);
    if (!Number.isNaN(heroId) && heroId > 0) {
      heroSummary = getHeroSummary(heroId);
    }
  }

  const heroId = heroSummary?.id ?? 0;
  const { data: heroStats, isLoading, isError } = useHeroDetail(heroId);

  const computed = useMemo(() => {
    if (!heroSummary || !heroStats) return null;

    const statsEntry = heroStats.find((entry) => entry.hero_id === heroSummary!.id);
    if (!statsEntry) return null;

    const matchesAll = heroStats.reduce((sum, entry) => sum + (entry.matches ?? 0), 0);
    const matches = statsEntry.matches ?? 0;
    if (matches <= 0) return null;

    const wins = statsEntry.wins ?? 0;
    const winrate = matches > 0 ? wins / matches : 0;
    const pickRate = matchesAll > 0 ? matches / matchesAll : 0;
    const tier = resolveHeroTier(winrate);
    const iconUrl = getHeroIconUrl(heroSummary!.id, { prefer: 'webp' });

    const average = (total?: number | null) =>
      typeof total === 'number' && matches > 0 ? total / matches : undefined;

    const averageKills = average(statsEntry.total_kills);
    const averageDeaths = average(statsEntry.total_deaths);
    const averageAssists = average(statsEntry.total_assists);
    const averageShotsHit = average(statsEntry.total_shots_hit);
    const averageShotsMissed = average(statsEntry.total_shots_missed);
    const averageMaxHealth = average(statsEntry.total_max_health);
    const averagePlayerDamage = average(statsEntry.total_player_damage);
    const averagePlayerDamageTaken = average(statsEntry.total_player_damage_taken);
    const averageCreepDamage = average(statsEntry.total_creep_damage);
    const averageNeutralDamage = average(statsEntry.total_neutral_damage);
    const accuracy =
      typeof averageShotsHit === 'number' && typeof averageShotsMissed === 'number'
        ? (() => {
            const totalShots = averageShotsHit + averageShotsMissed;
            return totalShots > 0 ? averageShotsHit / totalShots : undefined;
          })()
        : undefined;

    const averageStats: HeroAverageStat[] = [
      {
        label: 'KDA',
        value: `${formatAverage(averageKills)} / ${formatAverage(averageDeaths)} / ${formatAverage(averageAssists)}`,
      },
      { label: 'Accuracy', value: formatPercent(accuracy) },
      { label: 'Player damage', value: formatWholeNumber(averagePlayerDamage) },
      { label: 'Damage taken', value: formatWholeNumber(averagePlayerDamageTaken) },
      { label: 'Net worth', value: formatWholeNumber(average(statsEntry.total_net_worth)) },
      { label: 'Last hits', value: formatWholeNumber(average(statsEntry.total_last_hits)) },
      { label: 'Denies', value: formatAverage(average(statsEntry.total_denies), { decimals: 2 }) },
      { label: 'Max health', value: formatWholeNumber(averageMaxHealth) },
      { label: 'Creep damage', value: formatWholeNumber(averageCreepDamage) },
      { label: 'Neutral damage', value: formatWholeNumber(averageNeutralDamage) },
      { label: 'Shots hit', value: formatWholeNumber(averageShotsHit) },
      { label: 'Shots missed', value: formatWholeNumber(averageShotsMissed) },
    ].filter((stat) => stat.value !== '\u2014');

    const headerMetrics = [
      { label: 'Win rate', value: formatPercent(winrate), accent: true },
      { label: 'Pick rate', value: formatPercent(pickRate) },
      { label: 'Tier', value: tier ?? '\u2014', accent: Boolean(tier) },
      { label: 'Games', value: matches.toLocaleString() },
    ] as const;

    return { iconUrl, averageStats, headerMetrics };
  }, [heroSummary, heroStats]);

  if (!heroSummary) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          Not Found
        </span>
        <h2 className="text-3xl font-semibold text-white">Hero not found.</h2>
        <p className="text-sm text-[rgba(245,247,245,0.65)]">
          No hero matches the slug &ldquo;{slug}&rdquo;.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !computed) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          No Data
        </span>
        <h2 className="text-3xl font-semibold text-white">No stats available for {heroSummary.name}.</h2>
        <p className="text-sm text-[rgba(245,247,245,0.65)]">
          This hero may not have enough match data yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      <HeroDetailHeader
        heroName={heroSummary.name}
        heroSlug={heroSummary.slug}
        iconUrl={computed.iconUrl}
        metrics={computed.headerMetrics}
      />

      <div className="grid gap-[4px] sm:grid-cols-2 lg:grid-cols-3">
        <HeroAverageStatsPanel title={`${heroSummary.name} Average Stats`} stats={computed.averageStats} />
      </div>
    </div>
  );
}
