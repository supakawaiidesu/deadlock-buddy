import type { ReactNode } from 'react';
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

export type DashboardPanelInstance = {
  id: string;
  type: DashboardPanelType;
};

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

export type DashboardPanelDefinition = {
  type: DashboardPanelType;
  title: string;
  description?: string;
  panelKeyBase: string;
  columnSpan?: 1 | 2 | 3;
  render: (props: {
    instance: DashboardPanelInstance;
    data: DashboardDataBundle;
    headerActions?: ReactNode;
    outerRef?: (node: HTMLDivElement | null) => void;
  }) => ReactNode;
};

export type DashboardPanelRegistry = Record<DashboardPanelType, DashboardPanelDefinition>;
