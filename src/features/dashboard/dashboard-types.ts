import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRegistry,
} from '@/features/widgets/widget-types';
import type { HeroLeaderboardEntry } from '@/features/heroes/components/hero-leaderboard-panel';
import type { ItemWinrateEntry } from '@/lib/api/analytics';
import type { LeaderboardEntry, RankDistributionEntry } from '@/lib/api/schema';

export type DashboardPanelType =
  | 'telemetry-snapshot'
  | 'na-leaderboard'
  | 'rank-distribution'
  | 'hero-popularity'
  | 'hero-winrate'
  | 'item-popularity'
  | 'item-winrate';

export type DashboardPanelInstance = WidgetInstance<DashboardPanelType>;

export type DashboardDataBundle = {
  leaderboardEntries: LeaderboardEntry[];
  heroWinrateEntries: HeroLeaderboardEntry[];
  heroPopularityEntries: HeroLeaderboardEntry[];
  itemWinrateEntries: ItemWinrateEntry[];
  itemPopularityEntries: ItemWinrateEntry[];
  rankDistributionEntries: RankDistributionEntry[];
  rankDistributionMinUnixTimestamp?: number;
  heroCount: number;
  highestBadge: number;
};

export type DashboardPanelDefinition = WidgetDefinition<
  DashboardPanelType,
  DashboardDataBundle
>;

export type DashboardPanelRegistry = WidgetRegistry<
  DashboardPanelType,
  DashboardDataBundle
>;
