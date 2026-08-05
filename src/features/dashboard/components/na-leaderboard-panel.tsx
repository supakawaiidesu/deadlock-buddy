import type { ReactNode } from 'react';
import { Panel } from '@/ui/panel';
import type { LeaderboardEntry } from '@/lib/api/schema';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';

type NaLeaderboardPanelProps = {
  entries: readonly LeaderboardEntry[];
  headerActions?: ReactNode;
};

export function NaLeaderboardPanel({ entries, headerActions }: NaLeaderboardPanelProps) {
  return (
    <Panel className="flex h-full flex-col gap-[4px] !p-0">
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          NA leaderboard highlight
        </h2>
        <div className="panel-header-actions">
          <span className="panel-header-meta">Top {entries.length || 0}</span>
          {headerActions}
        </div>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 scroll-quiet">
        {entries.map((entry) => (
          <li
            key={`${entry.rank}-${entry.account_name}`}
            className="flex items-center justify-between border-b border-[rgb(var(--text-rgb)/0.12)] px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.7)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-[rgb(var(--text-rgb)/0.45)]">#{entry.rank}</span>
              <span className="font-semibold text-[var(--text-strong)]">{entry.account_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {entry.top_hero_ids.slice(0, 3).map((heroId) => {
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
