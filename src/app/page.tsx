import Link from 'next/link';
import { Panel } from '@/ui/panel';
import { DashboardLayout } from '@/features/dashboard/components/dashboard-layout';
import { fetchLeaderboard } from '@/lib/api/leaderboard';
import {
  fetchHeroWinrateLeaderboard,
  fetchHeroPopularityLeaderboard,
  fetchItemWinrateLeaderboard,
  fetchItemPopularityLeaderboard,
  type ItemWinrateEntry,
} from '@/lib/api/analytics';
import type { HeroScoreboardEntry, LeaderboardEntry } from '@/lib/api/schema';
import { heroSummaries } from '@/lib/data/heroes';
import type { DashboardDataBundle } from '@/features/dashboard/dashboard-types';
import type { HeroLeaderboardEntry } from '@/features/heroes/components/hero-leaderboard-panel';

const LEADERBOARD_REGION = 'NAmerica';

async function getLeaderboardSample(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboard = await fetchLeaderboard(LEADERBOARD_REGION);
    return leaderboard.slice(0, 50);
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

async function getHeroPopularitySample(): Promise<HeroScoreboardEntry[]> {
  try {
    return await fetchHeroPopularityLeaderboard(50);
  } catch (error) {
    console.error('Failed to load hero popularity leaderboard', error);
    return [];
  }
}

async function getItemWinrateSample(): Promise<ItemWinrateEntry[]> {
  try {
    return await fetchItemWinrateLeaderboard(50);
  } catch (error) {
    console.error('Failed to load item winrate leaderboard', error);
    return [];
  }
}

async function getItemPopularitySample(): Promise<ItemWinrateEntry[]> {
  try {
    return await fetchItemPopularityLeaderboard(50);
  } catch (error) {
    console.error('Failed to load item popularity leaderboard', error);
    return [];
  }
}

export default async function Home() {
  const leaderboardEntries = await getLeaderboardSample();
  const heroWinrateEntries = await getHeroWinrateSample();
  const heroPopularityEntries = await getHeroPopularitySample();
  const itemWinrateEntries = await getItemWinrateSample();
  const itemPopularityEntries = await getItemPopularitySample();
  const heroWinratePanelEntries: HeroLeaderboardEntry[] = heroWinrateEntries.map((entry) => ({
    ...entry,
    winrateRank: entry.rank,
    winrateValue: entry.value,
  }));
  const heroWinrateById = new Map(heroWinrateEntries.map((entry) => [entry.hero_id, entry] as const));
  const heroPopularityPanelEntries: HeroLeaderboardEntry[] = heroPopularityEntries.map((entry) => {
    const winrate = heroWinrateById.get(entry.hero_id);
    return {
      ...entry,
      winrateRank: winrate?.rank,
      winrateValue: winrate?.value,
    };
  });
  const heroCount = heroSummaries.length;
  const highestBadge = leaderboardEntries.reduce((acc, entry) => {
    if (typeof entry.badge_level === 'number') {
      return Math.max(acc, entry.badge_level);
    }
    return acc;
  }, 0);
  const dashboardData: DashboardDataBundle = {
    leaderboardEntries,
    heroWinrateEntries: heroWinratePanelEntries,
    heroPopularityEntries: heroPopularityPanelEntries,
    itemWinrateEntries,
    itemPopularityEntries,
    heroCount,
    highestBadge,
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <div className="grid gap-[2px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.55)]">
            <span>Deadlock API Patch:10-09-24</span>
            <span>Region · {LEADERBOARD_REGION}</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold uppercase tracking-[0.14em] text-white">
            618Lock
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[rgba(245,247,245,0.7)]">
              something something deadlock opensource blah blah
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

      <DashboardLayout data={dashboardData} />
    </div>
  );
}
