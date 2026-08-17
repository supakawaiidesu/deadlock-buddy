import type {
  DashboardPanelInstance,
  DashboardPanelRegistry,
} from '@/features/dashboard/dashboard-types';
import { dashboardPanelManifest } from '@/features/dashboard/dashboard-panel-manifest';
import { RankDistributionPanel } from '@/features/analytics/components/rank-distribution-panel';
import { HeroLeaderboardPanel } from '@/features/heroes/components/hero-leaderboard-panel';
import { ItemLeaderboardPanel } from '@/features/items/components/item-leaderboard-panel';
import { NaLeaderboardPanel } from '@/features/dashboard/components/na-leaderboard-panel';
import { TelemetrySnapshotPanel } from '@/features/dashboard/components/telemetry-snapshot-panel';
import { PopularLayoutsPanel } from '@/features/dashboard/components/popular-layouts-panel';

export const dashboardPanelRegistry: DashboardPanelRegistry = {
  'telemetry-snapshot': {
    type: 'telemetry-snapshot',
    ...dashboardPanelManifest['telemetry-snapshot'],
    render: ({ data, headerActions }) => (
      <TelemetrySnapshotPanel
        leaderboardSampleSize={data.leaderboardEntries.length}
        heroCount={data.heroCount}
        highestBadge={data.highestBadge}
        heroWinrateEntries={data.heroWinrateEntries}
        headerActions={headerActions}
      />
    ),
  },
  'rank-distribution': {
    type: 'rank-distribution',
    ...dashboardPanelManifest['rank-distribution'],
    render: ({ data, headerActions }) => (
      <RankDistributionPanel
        entries={data.rankDistributionEntries}
        minUnixTimestamp={data.rankDistributionMinUnixTimestamp}
        headerActions={headerActions}
      />
    ),
  },
  'na-leaderboard': {
    type: 'na-leaderboard',
    ...dashboardPanelManifest['na-leaderboard'],
    render: ({ data, headerActions }) => (
      <NaLeaderboardPanel
        entries={data.leaderboardEntries}
        headerActions={headerActions}
      />
    ),
  },
  'hero-popularity': {
    type: 'hero-popularity',
    ...dashboardPanelManifest['hero-popularity'],
    render: ({ instance, data, headerActions }) => (
      <HeroLeaderboardPanel
        title="Hero popularity ranking"
        panelKey={`${'hero-popularity'}-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.heroPopularityEntries}
        headerActions={headerActions}
      />
    ),
  },
  'hero-winrate': {
    type: 'hero-winrate',
    ...dashboardPanelManifest['hero-winrate'],
    render: ({ instance, data, headerActions }) => (
      <HeroLeaderboardPanel
        title="Hero winrate ranking"
        panelKey={`${'hero-winrate'}-${instance.id}`}
        mode="winrate"
        limit={50}
        initialEntries={data.heroWinrateEntries}
        headerActions={headerActions}
      />
    ),
  },
  'item-popularity': {
    type: 'item-popularity',
    ...dashboardPanelManifest['item-popularity'],
    render: ({ instance, data, headerActions }) => (
      <ItemLeaderboardPanel
        title="Item popularity ranking"
        panelKey={`${'item-popularity'}-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.itemPopularityEntries}
        headerActions={headerActions}
      />
    ),
  },
  'item-winrate': {
    type: 'item-winrate',
    ...dashboardPanelManifest['item-winrate'],
    render: ({ instance, data, headerActions }) => (
      <ItemLeaderboardPanel
        title="Item winrate ranking"
        panelKey={`${'item-winrate'}-${instance.id}`}
        mode="winrate"
        limit={10}
        initialEntries={data.itemWinrateEntries}
        headerActions={headerActions}
      />
    ),
  },
  'popular-layouts': {
    type: 'popular-layouts',
    ...dashboardPanelManifest['popular-layouts'],
    render: ({ data, headerActions }) => (
      <PopularLayoutsPanel
        entries={data.popularShares}
        headerActions={headerActions}
      />
    ),
  },
};

export const defaultDashboardLayout: DashboardPanelInstance[] = [
  { id: 'panel-telemetry', type: 'telemetry-snapshot', x: 0, y: 0, w: 1, h: 9 },
  { id: 'panel-rank-distribution', type: 'rank-distribution', x: 1, y: 0, w: 2, h: 13 },
  { id: 'panel-na-leaderboard', type: 'na-leaderboard', x: 0, y: 9, w: 1, h: 13 },
  { id: 'panel-hero-popularity', type: 'hero-popularity', x: 1, y: 13, w: 1, h: 13 },
  { id: 'panel-hero-winrate', type: 'hero-winrate', x: 2, y: 13, w: 1, h: 13 },
  { id: 'panel-item-popularity', type: 'item-popularity', x: 0, y: 22, w: 1, h: 13 },
  { id: 'panel-item-winrate', type: 'item-winrate', x: 1, y: 26, w: 1, h: 13 },
  { id: 'panel-popular-layouts', type: 'popular-layouts', x: 2, y: 26, w: 1, h: 13 },
];
