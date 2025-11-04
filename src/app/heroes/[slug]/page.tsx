import { notFound } from 'next/navigation';
import { fetchHeroStats } from '@/lib/api/analytics';
import { getHeroIconUrl, getHeroSummary, getHeroSummaryBySlug } from '@/lib/data/heroes';
import { HeroAverageStatsPanel } from '@/features/heroes/components/hero-average-stats-panel';
import type { HeroAverageStat } from '@/features/heroes/components/hero-average-stats-panel';
import { HeroDetailHeader } from '@/features/heroes/components/hero-detail-header';
import { resolveHeroTier } from '@/features/heroes/hero-tier';

type HeroPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatAverage(value?: number, options: { decimals?: number } = {}): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const decimals = options.decimals ?? 1;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatWholeNumber(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return Math.round(value).toLocaleString();
}

export default async function HeroDetailPage({ params }: HeroPageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  let heroSummary = getHeroSummaryBySlug(normalizedSlug);

  if (!heroSummary) {
    const heroId = Number.parseInt(normalizedSlug, 10);
    if (!Number.isNaN(heroId) && heroId > 0) {
      heroSummary = getHeroSummary(heroId);
    }
  }

  if (!heroSummary) {
    notFound();
  }

  const hero = heroSummary;

  const [heroStats] = await Promise.all([fetchHeroStats()]);

  const statsEntry = heroStats.find((entry) => entry.hero_id === hero.id);

  if (!statsEntry) {
    notFound();
  }

  const matchesAll = heroStats.reduce((sum, entry) => sum + (entry.matches ?? 0), 0);
  const matches = statsEntry.matches ?? 0;

  if (matches <= 0) {
    notFound();
  }

  const wins = statsEntry.wins ?? 0;
  const winrate = matches > 0 ? wins / matches : 0;
  const pickRate = matchesAll > 0 ? matches / matchesAll : 0;
  const tier = resolveHeroTier(winrate);
  const iconUrl = getHeroIconUrl(hero.id, { prefer: 'webp' });

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
  ].filter((stat) => stat.value !== '—');

  const headerMetrics = [
    { label: 'Win rate', value: formatPercent(winrate), accent: true },
    { label: 'Pick rate', value: formatPercent(pickRate) },
    { label: 'Tier', value: tier ?? '—', accent: Boolean(tier) },
    { label: 'Games', value: matches.toLocaleString() },
  ] as const;

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <HeroDetailHeader
        heroName={hero.name}
        heroSlug={hero.slug}
        iconUrl={iconUrl}
        metrics={headerMetrics}
      />

      <div className="grid gap-[2px] sm:grid-cols-2 lg:grid-cols-3">
        <HeroAverageStatsPanel title={`${hero.name} Average Stats`} stats={averageStats} />
      </div>
    </div>
  );
}
