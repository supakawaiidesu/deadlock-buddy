import type { ReactNode } from 'react';
import Image from 'next/image';
import { Panel } from '@/ui/panel';
import type { LeaderboardEntry } from '@/lib/api/schema';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';

type NaLeaderboardPanelProps = {
  entries: readonly LeaderboardEntry[];
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

export function NaLeaderboardPanel({ entries, headerActions, outerRef }: NaLeaderboardPanelProps) {
  return (
    <Panel ref={outerRef} className="flex flex-col gap-[2px] !p-0">
      <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          NA leaderboard highlight
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.45)]">
            Top {entries.length || 0}
          </span>
          {headerActions}
        </div>
      </div>
      <ul className="flex max-h-80 flex-col overflow-y-auto pr-2 scroll-quiet">
        {entries.map((entry) => (
          <li
            key={`${entry.rank}-${entry.account_name}`}
            className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.7)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-[rgba(245,247,245,0.45)]">#{entry.rank}</span>
              <span className="font-semibold text-white">{entry.account_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {entry.top_hero_ids.slice(0, 3).map((heroId) => {
                const iconUrl = getHeroIconUrl(heroId);
                const heroName = getHeroDisplayName(heroId);

                if (!iconUrl) {
                  return (
                    <span
                      key={heroId}
                      className="flex h-6 w-6 items-center justify-center border border-[rgba(255,255,255,0.12)] text-[10px] uppercase text-[rgba(245,247,245,0.55)]"
                    >
                      {heroName.slice(0, 1)}
                    </span>
                  );
                }

                return (
                  <Image
                    key={heroId}
                    src={iconUrl}
                    alt={`${heroName} icon`}
                    width={24}
                    height={24}
                    sizes="24px"
                    className="h-6 w-6 object-cover"
                  />
                );
              })}
            </div>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="px-4 py-3 text-xs text-[rgba(245,247,245,0.6)]">
            Leaderboard data unavailable right now.
          </li>
        ) : null}
      </ul>
    </Panel>
  );
}
