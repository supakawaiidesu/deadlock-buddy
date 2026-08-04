import { useMemo } from 'react';
import { usePlayerHeroStats, usePlayerOverview } from '@/features/players/api/queries';
import { buildHeroRows, computeOverallRecord, computeTopHeroes } from '@/features/players/lib/metrics';
import { formatNumber, formatPercent, formatRelativeTimestamp } from '@/lib/utils/format';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import { PlayerIdentityPanel } from './player-identity-panel';
import { MatchActivityPanel } from './match-activity-panel';

type PlayerProfileProps = {
  accountId: number;
};

function formatHeroCode(heroId: number): string {
  return heroId.toString().padStart(2, '0');
}

export function PlayerProfile({ accountId }: PlayerProfileProps) {
  const heroStatsQuery = usePlayerHeroStats(accountId);
  const overviewQuery = usePlayerOverview(accountId);

  const heroRows = useMemo(
    () => (heroStatsQuery.data ? buildHeroRows(heroStatsQuery.data) : []),
    [heroStatsQuery.data],
  );

  const topHeroes = useMemo(() => computeTopHeroes(heroRows), [heroRows]);
  const topHeroesWithMeta = useMemo(
    () =>
      topHeroes.map((hero) => ({
        ...hero,
        name: getHeroDisplayName(hero.heroId),
        iconUrl: getHeroIconUrl(hero.heroId),
      })),
    [topHeroes],
  );
  const record = useMemo(() => computeOverallRecord(heroRows), [heroRows]);
  const mmr = overviewQuery.data ?? null;

  if (heroStatsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-[4px] py-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (heroStatsQuery.isError || heroRows.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          No Data
        </span>
        <h2 className="text-3xl font-semibold text-[var(--text-strong)]">We couldn&apos;t find stats for this player.</h2>
        <p className="text-sm text-[rgb(var(--text-rgb)/0.65)]">
          Double-check the account ID or try again later&mdash;some accounts may be private or have limited ranked history.
        </p>
      </div>
    );
  }

  const matchesPlayed = record.matches;
  const uniqueHeroes = heroRows.length;
  const avgMatchesPerHero = uniqueHeroes ? matchesPlayed / uniqueHeroes : 0;
  const highestVolumeHero = heroRows.reduce((acc, row) => (row.matches > acc.matches ? row : acc), heroRows[0]);
  const bestWinHero = heroRows.reduce((acc, row) => (row.winRate > acc.winRate ? row : acc), heroRows[0]);
  const highestVolumeHeroName = getHeroDisplayName(highestVolumeHero.heroId);
  const bestWinHeroName = getHeroDisplayName(bestWinHero.heroId);
  const highestVolumeHeroCode = formatHeroCode(highestVolumeHero.heroId);
  const bestWinHeroCode = formatHeroCode(bestWinHero.heroId);

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      <div className="grid min-w-0 grid-cols-1 gap-[4px] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-[4px]">

          {/* The fixed activity track preserves square cells across the shared top row. */}
          <div className="grid min-w-0 grid-cols-1 gap-[4px] xl:grid-cols-[minmax(0,1fr)_minmax(0,378px)]">
            <PlayerIdentityPanel accountId={accountId} />
            <MatchActivityPanel accountId={accountId} />
          </div>

          {/* ── hero performance table ─────────────────────────────── */}
          <Panel className="flex flex-col gap-0 !p-0">
            <div className="panel-header">
              <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
                Hero Performance
              </h2>
              <div className="panel-header-actions">
                <span className="panel-header-meta">{heroRows.length} heroes</span>
              </div>
            </div>
            {/* Eight columns exceed a phone's width; scroll the table rather than
                letting its intrinsic width stretch every sibling panel. */}
            <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead className="uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.5)]">
                <tr>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 pl-3 pr-2 text-left font-medium">Hero</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">Matches</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">Win%</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">KDA</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">NW/Min</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">LH/Min</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 px-3 text-right font-medium">DMG/Min</th>
                  <th className="border-b border-[rgb(var(--text-rgb)/0.14)] py-2 pr-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {heroRows.map((row) => {
                  const name = getHeroDisplayName(row.heroId);
                  const iconUrl = getHeroIconUrl(row.heroId);

                  return (
                    <tr key={`${row.heroId}`} className="border-b border-[rgb(var(--text-rgb)/0.12)]">
                      <td className="py-3 pl-3 pr-2">
                        <div className="flex items-center gap-3">
                          {iconUrl ? (
                            <img src={iconUrl} alt={`${name} icon`} width={18} height={18} className="h-[18px] w-[18px] object-cover" />
                          ) : null}
                          <span className="font-semibold text-[var(--text-strong)]">{name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-[rgb(var(--text-rgb)/0.82)]">{formatNumber(row.matches)}</td>
                      <td className="py-3 px-3 text-right text-[var(--accent)]">{formatPercent(row.winRate)}</td>
                      <td className="py-3 px-3 text-right text-[rgb(var(--text-rgb)/0.82)]">{row.kda.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-[rgb(var(--text-rgb)/0.82)]">{formatNumber(row.networthPerMin)}</td>
                      <td className="py-3 px-3 text-right text-[rgb(var(--text-rgb)/0.82)]">{formatNumber(row.lastHitsPerMin)}</td>
                      <td className="py-3 px-3 text-right text-[rgb(var(--text-rgb)/0.82)]">{formatNumber(row.damagePerMin)}</td>
                      <td className="py-3 pr-3 text-right text-[rgb(var(--text-rgb)/0.6)]">{formatRelativeTimestamp(row.lastPlayed)}</td>
                    </tr>
                  );
                })}
                {heroRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-left text-[rgb(var(--text-rgb)/0.6)]" colSpan={8}>No hero data yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-[4px]">
          {/* ── profile signals ────────────────────────────────────── */}
          <Panel className="flex flex-col gap-0 !p-0">
            <div className="panel-header">
              <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-strong)]">
                Profile Signals
              </h2>
            </div>
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
          </Panel>

          {/* ── top heroes ─────────────────────────────────────────── */}
          <Panel className="flex flex-col gap-0 !p-0">
            <div className="panel-header">
              <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
                Top Heroes
              </h2>
              <div className="panel-header-actions">
                <span className="panel-header-meta">Volume {'\u00B7'} Win%</span>
              </div>
            </div>
            <ul className="flex flex-col">
              {topHeroesWithMeta.map((hero) => (
                <li
                  key={hero.heroId}
                  className="flex items-center justify-between border-b border-[rgb(var(--text-rgb)/0.12)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {hero.iconUrl ? (
                      <img src={hero.iconUrl} alt={`${hero.name} icon`} width={24} height={24} className="h-6 w-6 object-cover" />
                    ) : null}
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-[var(--text-strong)]">{hero.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.55)]">
                        Matches {formatNumber(hero.matches)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-strong)]">{formatPercent(hero.winRate)}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.55)]">
                      Last played {formatRelativeTimestamp(hero.lastPlayed)}
                    </p>
                  </div>
                </li>
              ))}
              {topHeroesWithMeta.length === 0 ? (
                <li className="py-3 text-xs text-[rgb(var(--text-rgb)/0.6)]">No hero data yet.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
