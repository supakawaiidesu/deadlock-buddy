import Image from 'next/image';
import Link from 'next/link';
import { Panel } from '@/ui/panel';
import { fetchLeaderboard } from '@/lib/api/leaderboard';
import { fetchHeroWinrateLeaderboard } from '@/lib/api/analytics';
import type { HeroScoreboardEntry, LeaderboardEntry } from '@/lib/api/schema';
import { heroSummaries, getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';

const LEADERBOARD_REGION = 'NAmerica';

async function getLeaderboardSample(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboard = await fetchLeaderboard(LEADERBOARD_REGION);
    return leaderboard.slice(0, 6);
  } catch (error) {
    console.error('Failed to load leaderboard', error);
    return [];
  }
}

async function getHeroWinrateSample(): Promise<HeroScoreboardEntry[]> {
  try {
    return await fetchHeroWinrateLeaderboard();
  } catch (error) {
    console.error('Failed to load hero winrate leaderboard', error);
    return [];
  }
}

export default async function Home() {
  const leaderboardEntries = await getLeaderboardSample();
  const heroWinrateEntries = await getHeroWinrateSample();
  const heroCount = heroSummaries.length;
  const highestBadge = leaderboardEntries.reduce((acc, entry) => {
    if (typeof entry.badge_level === 'number') {
      return Math.max(acc, entry.badge_level);
    }
    return acc;
  }, 0);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <div className="grid gap-[2px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.55)]">
            <span>Deadlock Tactical Terminal HUD</span>
            <span>Region · {LEADERBOARD_REGION}</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold uppercase tracking-[0.14em] text-white">
              Mission control console
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[rgba(245,247,245,0.7)]">
              Survey live leaderboard samples and access high-signal tools for players and heroes. Data pulls
              refresh continuously from the Deadlock API to keep scouting sharp.
            </p>
          </div>
          <div className="grid gap-[2px] sm:grid-cols-2">
            <Link
              href="/players"
              className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] bg-[var(--surface-muted)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.7)] transition hover:border-[var(--accent)] hover:text-white"
            >
              <span>Player lookup</span>
              <span className="text-[rgba(245,247,245,0.45)]">↗</span>
            </Link>
            <Link
              href="/players/342189169"
              className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] bg-[var(--surface-muted)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.7)] transition hover:border-[var(--accent)] hover:text-white"
            >
              <span>Sample profile</span>
              <span className="text-[rgba(245,247,245,0.45)]">↗</span>
            </Link>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-[2px] !p-0">
          <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Quick routes</h2>
            <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.45)]">Primary</span>
          </div>
          <ul className="flex flex-col">
            <li className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>Hero directory</span>
              <Link href="/heroes" className="text-[rgba(245,247,245,0.45)] hover:text-[var(--accent)]">
                /heroes
              </Link>
            </li>
            <li className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>MMR leaderboards</span>
              <Link href="/leaderboards" className="text-[rgba(245,247,245,0.45)] hover:text-[var(--accent)]">
                /leaderboards
              </Link>
            </li>
            <li className="flex items-center justify-between px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>Meta breakdown</span>
              <Link href="/meta" className="text-[rgba(245,247,245,0.45)] hover:text-[var(--accent)]">
                /meta
              </Link>
            </li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-[2px] lg:grid-cols-3">
        <Panel className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Telemetry snapshot</h2>
          <ul className="space-y-2 text-xs text-[rgba(245,247,245,0.65)]">
            <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2">
              <span>Leaderboard sample</span>
              <span className="font-semibold text-white">{leaderboardEntries.length || '—'}</span>
            </li>
            <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2">
              <span>Hero roster tracked</span>
              <span className="font-semibold text-white">{heroCount}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Highest badge · sample</span>
              <span className="font-semibold text-[var(--accent)]">{highestBadge || '—'}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Top winrate · sample</span>
              <span className="font-semibold text-[var(--accent)]">
                {heroWinrateEntries[0]
                  ? `${Math.round(heroWinrateEntries[0].value * 1000) / 10}%`
                  : '—'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Data refresh</span>
              <span className="font-semibold text-[rgba(245,247,245,0.55)]">~60 seconds</span>
            </li>
          </ul>
        </Panel>

        <Panel className="flex flex-col gap-[2px] !p-0">
          <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              NA leaderboard highlight
            </h2>
            <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.45)]">
              Top {leaderboardEntries.length || 0}
            </span>
          </div>
          <ul className="flex flex-col">
            {leaderboardEntries.map((entry) => (
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
            {leaderboardEntries.length === 0 ? (
              <li className="px-4 py-3 text-xs text-[rgba(245,247,245,0.6)]">
                Leaderboard data unavailable right now.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel className="flex flex-col gap-[2px] !p-0">
          <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              Hero winrate ranking
            </h2>
            <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.45)]">
              Top {heroWinrateEntries.length || 0}
            </span>
          </div>
          <ul className="flex max-h-80 flex-col overflow-y-auto pr-2 scroll-quiet">
            {heroWinrateEntries.map((entry) => {
              const heroName = getHeroDisplayName(entry.hero_id);
              const iconUrl = getHeroIconUrl(entry.hero_id);
              const winRatePercent = `${(entry.value * 100).toFixed(1)}%`;

              return (
                <li
                  key={entry.hero_id}
                  className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.72)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[rgba(245,247,245,0.45)]">#{entry.rank}</span>
                    {iconUrl ? (
                      <Image
                        src={iconUrl}
                        alt={`${heroName} icon`}
                        width={28}
                        height={28}
                        sizes="28px"
                        className="h-7 w-7 object-cover"
                      />
                    ) : null}
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-white">{heroName}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[rgba(245,247,245,0.5)]">
                        Matches {entry.matches.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-[var(--accent)]">{winRatePercent}</span>
                </li>
              );
            })}
            {heroWinrateEntries.length === 0 ? (
              <li className="px-4 py-4 text-xs text-[rgba(245,247,245,0.6)]">Hero winrate data unavailable.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
