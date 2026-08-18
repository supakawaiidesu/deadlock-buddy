import type { ReactNode } from 'react';
import { Panel } from '@/ui/panel';
import type { LeaderboardEntry } from '@/lib/api/schema';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';

type NaLeaderboardPanelProps = {
  entries: readonly LeaderboardEntry[];
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};

export function NaLeaderboardPanel({ entries, headerActions, size }: NaLeaderboardPanelProps) {
  const isCompact = size.width === null || size.width < 420;
  return (
    <Panel className="flex h-full flex-col gap-[4px] !p-0">
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          NA leaderboard highlight
        </h2>
        <div className="panel-header-actions">
          {isCompact ? null : <span className="panel-header-meta">Top {entries.length || 0}</span>}
          {headerActions}
        </div>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 scroll-quiet">
        {entries.map((entry) => (
          <li
            key={`${entry.rank}-${entry.account_name}`}
            className="flex min-w-0 items-center justify-between gap-2 border-b border-[rgb(var(--text-rgb)/0.12)] px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.7)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[rgb(var(--text-rgb)/0.45)]">#{entry.rank}</span>
              <span className="min-w-0 truncate font-semibold text-[var(--text-strong)]">{entry.account_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {entry.top_hero_ids.slice(0, isCompact ? 1 : 3).map((heroId) => {
                const iconUrl = getHeroIconUrl(heroId);
                const heroName = getHeroDisplayName(heroId);

                if (!iconUrl) {
                  return (
                    <span
                      key={heroId}
                      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--neutral-rgb)/0.12)] text-[10px] uppercase text-[rgb(var(--text-rgb)/0.55)]"
                    >
                      {heroName.slice(0, 1)}
                    </span>
                  );
                }

                return (
                  <img
                    key={heroId}
                    src={iconUrl}
                    alt={`${heroName} icon`}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-cover"
                  />
                );
              })}
            </div>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.6)]">
            Leaderboard data unavailable right now.
          </li>
        ) : null}
      </ul>
    </Panel>
  );
}
