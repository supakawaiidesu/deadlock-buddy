import { useMemo, type ReactNode } from 'react';
import { usePlayerHeroStats, usePlayerOverview } from '@/features/players/api/queries';
import { buildHeroRows, computeOverallRecord } from '@/features/players/lib/metrics';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { getHeroDisplayName } from '@/lib/data/heroes';
import { Skeleton } from '@/ui/skeleton';
import {
  WidgetMessage,
  WidgetPanel,
} from '@/features/widgets/components/widget-panel';

type Props = {
  accountId: number;
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

function formatHeroCode(heroId: number): string {
  return heroId.toString().padStart(2, '0');
}

export function ProfileSignalsPanel({ accountId, headerActions, outerRef }: Props) {
  const heroStatsQuery = usePlayerHeroStats(accountId);
  const overviewQuery = usePlayerOverview(accountId);
  const heroRows = useMemo(
    () => (heroStatsQuery.data ? buildHeroRows(heroStatsQuery.data) : []),
    [heroStatsQuery.data],
  );
  const record = useMemo(() => computeOverallRecord(heroRows), [heroRows]);
  const mmr = overviewQuery.data ?? null;

  if (heroStatsQuery.isLoading) {
    return (
      <WidgetPanel title="Profile signals" headerActions={headerActions} outerRef={outerRef}>
        <Skeleton className="h-48 w-full" />
      </WidgetPanel>
    );
  }

  if (heroStatsQuery.isError) {
    return (
      <WidgetPanel title="Profile signals" headerActions={headerActions} outerRef={outerRef}>
        <WidgetMessage>Profile signals are unavailable right now. Try again later.</WidgetMessage>
      </WidgetPanel>
    );
  }

  if (heroRows.length === 0) {
    return (
      <WidgetPanel title="Profile signals" headerActions={headerActions} outerRef={outerRef}>
        <WidgetMessage>No hero data yet.</WidgetMessage>
      </WidgetPanel>
    );
  }

  const matchesPlayed = record.matches;
  const uniqueHeroes = heroRows.length;
  const avgMatchesPerHero = uniqueHeroes ? matchesPlayed / uniqueHeroes : 0;
  const highestVolumeHero = heroRows.reduce(
    (acc, row) => (row.matches > acc.matches ? row : acc),
    heroRows[0],
  );
  const bestWinHero = heroRows.reduce(
    (acc, row) => (row.winRate > acc.winRate ? row : acc),
    heroRows[0],
  );
  const highestVolumeHeroName = getHeroDisplayName(highestVolumeHero.heroId);
  const bestWinHeroName = getHeroDisplayName(bestWinHero.heroId);
  const highestVolumeHeroCode = formatHeroCode(highestVolumeHero.heroId);
  const bestWinHeroCode = formatHeroCode(bestWinHero.heroId);

  return (
    <WidgetPanel title="Profile signals" headerActions={headerActions} outerRef={outerRef}>
      <ul className="flex flex-col divide-y divide-[var(--surface-border-muted)] text-xs text-[rgb(var(--text-rgb)/0.72)]">
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Player score</span>
          <span className="truncate font-semibold text-[var(--accent)]">
            {formatNumber(mmr?.player_score ?? 0)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Leaderboard</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">
            {mmr?.rank ? `Rank ${formatNumber(mmr.rank)}` : 'Unranked'}
          </span>
        </li>
        {mmr?.division ? (
          <li className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Division</span>
            <span className="truncate font-semibold text-[var(--text-strong)]">
              {formatNumber(mmr.division)} {'\u00B7'} Tier {mmr.division_tier ?? '\u2014'}
            </span>
          </li>
        ) : null}
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Lifetime record</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">
            {formatNumber(record.wins)}W {'\u00B7'} {formatNumber(record.losses)}L
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Win rate</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">{formatPercent(record.winRate)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Matches tracked</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">{formatNumber(matchesPlayed)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Unique heroes</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">{formatNumber(uniqueHeroes)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Avg matches / hero</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">{avgMatchesPerHero.toFixed(1)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Volume anchor</span>
          <span className="truncate font-semibold text-[var(--text-strong)]">
            [{highestVolumeHeroCode}] {highestVolumeHeroName.toUpperCase()}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.55)]">Best winrate</span>
          <span className="truncate font-semibold text-[var(--accent)]">
            [{bestWinHeroCode}] {bestWinHeroName.toUpperCase()} {'\u00B7'} {formatPercent(bestWinHero.winRate)}
          </span>
        </li>
      </ul>
    </WidgetPanel>
  );
}
