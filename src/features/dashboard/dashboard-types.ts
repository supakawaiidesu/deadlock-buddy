import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRegistry,
} from '@/features/widgets/widget-types';
import type { HeroLeaderboardEntry } from '@/features/heroes/components/hero-leaderboard-panel';
import type { ItemWinrateEntry } from '@/lib/api/analytics';
import type { BadgeDistributionEntry, LeaderboardEntry, PopularShare } from '@/lib/api/schema';

export type DashboardPanelType =
  | 'telemetry-snapshot'
  | 'na-leaderboard'
  | 'rank-distribution'
  | 'hero-popularity'
  | 'hero-winrate'
  | 'hero-winrate-over-time'
  | 'item-popularity'
  | 'item-winrate'
  | 'popular-layouts';

export type HeroWinrateOverTimeSettings = {
  heroIds: number[];
  minUnixTimestamp: number;
  minAverageBadge: number;
  maxAverageBadge: number;
};

export type GeometryDashboardPanelInstance = WidgetInstance<Exclude<
  DashboardPanelType,
  'hero-winrate-over-time'
>>;

export type HeroWinrateOverTimePanelInstance = WidgetInstance<'hero-winrate-over-time'> & {
  settings: HeroWinrateOverTimeSettings;
};

export type DashboardPanelInstance =
  | GeometryDashboardPanelInstance
  | HeroWinrateOverTimePanelInstance;

export function createDefaultHeroWinrateOverTimeSettings(
  now = Date.now(),
): HeroWinrateOverTimeSettings {
  const date = new Date(now);
  const todayUtcSeconds = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ) / 1000;

  return {
    heroIds: [1],
    minUnixTimestamp: todayUtcSeconds - 30 * 86_400,
    minAverageBadge: 91,
    maxAverageBadge: 116,
  };
}

export type DashboardDataBundle = {
  isReady: true;
  leaderboardEntries: LeaderboardEntry[];
  heroWinrateEntries: HeroLeaderboardEntry[];
  heroPopularityEntries: HeroLeaderboardEntry[];
  itemWinrateEntries: ItemWinrateEntry[];
  itemPopularityEntries: ItemWinrateEntry[];
  rankDistributionEntries: BadgeDistributionEntry[];
  popularShares: PopularShare[];
  rankDistributionMinUnixTimestamp?: number;
  heroCount: number;
  highestBadge: number;
};

export type DashboardPanelDefinition = WidgetDefinition<
  DashboardPanelType,
  DashboardDataBundle,
  DashboardPanelInstance
>;

export type DashboardPanelRegistry = WidgetRegistry<
  DashboardPanelType,
  DashboardDataBundle,
  DashboardPanelInstance
>;
