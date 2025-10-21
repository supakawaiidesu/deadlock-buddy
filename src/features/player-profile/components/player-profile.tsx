'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import {
  usePlayerHeroStats,
  usePlayerMMRHistory,
  usePlayerOverview,
} from '@/features/players/api/queries';
import { buildHeroRows, computeOverallRecord, computeTopHeroes } from '@/features/players/lib/metrics';
import {
  formatCompactNumber,
  formatNumber,
  formatPercent,
  formatRelativeTimestamp,
} from '@/lib/utils/format';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { Panel } from '@/ui/panel';
import { Stat } from '@/ui/stat';
import { Skeleton } from '@/ui/skeleton';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type PlayerProfileProps = {
  accountId: number;
};

type ChartDatum = {
  label: string;
  score: number;
  delta: number;
};

function formatHeroCode(heroId: number): string {
  return heroId.toString().padStart(2, '0');
}

function buildHistoryChartData(
  history: Array<{ start_time: number; player_score: number; delta: number }>,
): ChartDatum[] {
  return history.map((entry) => ({
    label: new Date(entry.start_time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: entry.player_score ?? 0,
    delta: entry.delta ?? 0,
  }));
}

function HistoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDatum }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  const deltaValue = point?.delta ?? 0;
  const signedDelta =
    deltaValue > 0 ? `+${formatNumber(deltaValue)}` : deltaValue < 0 ? `−${formatNumber(Math.abs(deltaValue))}` : '0';

  return (
    <div className="space-y-1 border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 text-sm">
      <p className="font-medium text-white">{label}</p>
      <p className="text-xs text-[rgba(245,247,245,0.65)]">Score {formatNumber(payload[0].value ?? 0)}</p>
      <p className="text-xs text-[var(--accent)]">Δ {signedDelta}</p>
    </div>
  );
}

export function PlayerProfile({ accountId }: PlayerProfileProps) {
  const heroStatsQuery = usePlayerHeroStats(accountId);
  const overviewQuery = usePlayerOverview(accountId);
  const historyQuery = usePlayerMMRHistory(accountId);

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
  const historyData = useMemo(() => buildHistoryChartData(historyQuery.data ?? []), [historyQuery.data]);

  if (heroStatsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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
        <h2 className="text-3xl font-semibold text-white">We couldn’t find stats for this player.</h2>
        <p className="text-sm text-[rgba(245,247,245,0.65)]">
          Double-check the account ID or try again later—some accounts may be private or have limited ranked history.
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
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <div className="grid gap-[2px] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid gap-[2px]">
          <Panel className="grid gap-[2px] lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-[2px]">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(245,247,245,0.5)]">
                Player Overview
              </span>
              <h1 className="text-4xl font-semibold text-white md:text-5xl">{accountId}</h1>
              <p className="text-sm leading-relaxed text-[rgba(245,247,245,0.68)]">
                Snapshot of your competitive footprint—score, win record, and hero depth condensed for quick reads.
              </p>
              {mmr?.start_time ? (
                <p className="text-xs uppercase tracking-[0.24em] text-[rgba(245,247,245,0.45)]">
                  Updated {formatRelativeTimestamp(mmr.start_time)}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-[2px] sm:grid-cols-3">
              <Stat
                label="Player Score"
                value={formatNumber(mmr?.player_score ?? 0)}
                description="Latest hidden rating snapshot."
                accent
              />
              <Stat
                label="Leaderboard"
                value={mmr?.rank ? `Rank ${formatNumber(mmr.rank)}` : 'Unranked'}
                description={
                  mmr?.division
                    ? `Division ${mmr.division ?? '—'} · Tier ${mmr.division_tier ?? '—'}`
                    : 'Global ladder slot.'
                }
              />
              <Stat
                label="Lifetime Record"
                value={`${formatNumber(record.wins)}W · ${formatNumber(record.losses)}L`}
                description={`${formatPercent(record.winRate)} win rate overall.`}
              />
            </div>
          </Panel>

          <Panel className="flex flex-col gap-[2px]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Score Momentum</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.5)]">Recent matches</span>
            </div>
            <div className="h-56 w-full lg:h-64">
              {historyData.length > 1 ? (
                <ResponsiveContainer>
                  <LineChart data={historyData}>
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.28)" tickLine={false} />
                    <YAxis
                      stroke="rgba(255,255,255,0.28)"
                      tickLine={false}
                      width={64}
                      tickFormatter={(value: number) => formatCompactNumber(value)}
                    />
                    <Tooltip content={<HistoryTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3fc96d"
                      strokeWidth={2}
                      dot={{ stroke: '#3fc96d', strokeWidth: 1.5, r: 2.5 }}
                      activeDot={{ r: 4, fill: '#3fc96d' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center border border-dashed border-[var(--surface-border-muted)] text-xs text-[rgba(245,247,245,0.6)]">
                  Not enough matches to plot score history yet.
                </div>
              )}
            </div>
          </Panel>

          <Panel className="flex flex-col gap-0 !p-0">
            <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-3 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Hero Performance</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-[rgba(245,247,245,0.5)]">Role agnostic</span>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.5)]">
                <tr>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 pl-3 pr-2 text-left font-medium">Hero</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">Matches</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">Win%</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">KDA</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">NW/Min</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">LH/Min</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 px-3 text-right font-medium">DMG/Min</th>
                  <th className="border-b border-[rgba(245,247,245,0.14)] py-2 pr-3 text-right font-medium">
                    Last Played
                  </th>
                </tr>
              </thead>
              <tbody>
                {heroRows.map((row) => {
                  const name = getHeroDisplayName(row.heroId);
                  const iconUrl = getHeroIconUrl(row.heroId);

                  return (
                    <tr key={`${row.heroId}`} className="border-b border-[rgba(245,247,245,0.12)]">
                      <td className="py-3 pl-3 pr-2">
                        <div className="flex items-center gap-3">
                          {iconUrl ? (
                            <Image
                              src={iconUrl}
                              alt={`${name} icon`}
                              width={18}
                              height={18}
                              sizes="18px"
                              className="h-[18px] w-[18px] object-cover"
                            />
                          ) : null}
                          <span className="font-semibold text-white">{name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-[rgba(245,247,245,0.82)]">{formatNumber(row.matches)}</td>
                      <td className="py-3 px-3 text-right text-[var(--accent)]">{formatPercent(row.winRate)}</td>
                      <td className="py-3 px-3 text-right text-[rgba(245,247,245,0.82)]">{row.kda.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-[rgba(245,247,245,0.82)]">
                        {formatNumber(row.networthPerMin)}
                      </td>
                      <td className="py-3 px-3 text-right text-[rgba(245,247,245,0.82)]">
                        {formatNumber(row.lastHitsPerMin)}
                      </td>
                      <td className="py-3 px-3 text-right text-[rgba(245,247,245,0.82)]">
                        {formatNumber(row.damagePerMin)}
                      </td>
                      <td className="py-3 pr-3 text-right text-[rgba(245,247,245,0.6)]">
                        {formatRelativeTimestamp(row.lastPlayed)}
                      </td>
                    </tr>
                  );
                })}
                {heroRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-left text-[rgba(245,247,245,0.6)]" colSpan={8}>
                      No hero data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="grid gap-[2px]">
          <Panel className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Profile Signals</h2>
            <ul className="grid gap-1 text-xs text-[rgba(245,247,245,0.72)]">
              <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-1">
                <span className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.55)]">Matches tracked</span>
                <span className="font-semibold text-white">{formatNumber(matchesPlayed)}</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-1">
                <span className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.55)]">Unique heroes</span>
                <span className="font-semibold text-white">{formatNumber(uniqueHeroes)}</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-1">
                <span className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.55)]">Avg matches / hero</span>
                <span className="font-semibold text-white">{avgMatchesPerHero.toFixed(1)}</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-1">
                <span className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.55)]">Volume anchor</span>
                <span className="font-semibold text-white">
                  [{highestVolumeHeroCode}] {highestVolumeHeroName.toUpperCase()}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="uppercase tracking-[0.18em] text-[rgba(245,247,245,0.55)]">Best winrate</span>
                <span className="font-semibold text-[var(--accent)]">
                  [{bestWinHeroCode}] {bestWinHeroName.toUpperCase()} · {formatPercent(bestWinHero.winRate)}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel className="flex flex-col gap-0 !p-0">
            <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-3 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Top Heroes</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.45)]">Volume · Win%</span>
            </div>
            <ul className="flex flex-col">
              {topHeroesWithMeta.map((hero) => (
                <li
                  key={hero.heroId}
                  className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {hero.iconUrl ? (
                      <Image
                        src={hero.iconUrl}
                        alt={`${hero.name} icon`}
                        width={24}
                        height={24}
                        sizes="24px"
                        className="h-6 w-6 object-cover"
                      />
                    ) : null}
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-white">{hero.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.55)]">
                        Matches {formatNumber(hero.matches)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatPercent(hero.winRate)}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.55)]">
                      Last played {formatRelativeTimestamp(hero.lastPlayed)}
                    </p>
                  </div>
                </li>
              ))}
              {topHeroesWithMeta.length === 0 ? (
                <li className="py-3 text-xs text-[rgba(245,247,245,0.6)]">No hero data yet.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
