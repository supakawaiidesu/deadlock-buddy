import { useMemo, type ReactNode } from 'react';
import { usePlayerHeroStats } from '@/features/players/api/queries';
import { computeTopHeroes, buildHeroRows } from '@/features/players/lib/metrics';
import { formatNumber, formatPercent, formatRelativeTimestamp } from '@/lib/utils/format';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
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

export function TopHeroesPanel({ accountId, headerActions, outerRef }: Props) {
  const heroStatsQuery = usePlayerHeroStats(accountId);
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

  return (
    <WidgetPanel
      title="Top heroes"
      meta={<span className="panel-header-meta">Volume {'\u00B7'} Win%</span>}
      headerActions={headerActions}
      outerRef={outerRef}
    >
      {heroStatsQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : heroStatsQuery.isError ? (
        <WidgetMessage>Hero stats are unavailable right now. Try again later.</WidgetMessage>
      ) : (
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
      )}
    </WidgetPanel>
  );
}
