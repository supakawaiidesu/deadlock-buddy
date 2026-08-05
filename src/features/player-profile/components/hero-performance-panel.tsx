import { useMemo, type ReactNode } from 'react';
import { usePlayerHeroStats } from '@/features/players/api/queries';
import { buildHeroRows } from '@/features/players/lib/metrics';
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

export function HeroPerformancePanel({ accountId, headerActions, outerRef }: Props) {
  const heroStatsQuery = usePlayerHeroStats(accountId);
  const heroRows = useMemo(
    () => (heroStatsQuery.data ? buildHeroRows(heroStatsQuery.data) : []),
    [heroStatsQuery.data],
  );

  return (
    <WidgetPanel
      title="Hero performance"
      meta={<span className="panel-header-meta">{heroRows.length} heroes</span>}
      headerActions={headerActions}
      outerRef={outerRef}
    >
      {heroStatsQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : heroStatsQuery.isError ? (
        <WidgetMessage>Hero stats are unavailable right now. Try again later.</WidgetMessage>
      ) : (
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
      )}
    </WidgetPanel>
  );
}
