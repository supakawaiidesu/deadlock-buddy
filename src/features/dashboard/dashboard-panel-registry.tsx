import type {
  DashboardPanelInstance,
  DashboardPanelRegistry,
} from '@/features/dashboard/dashboard-types';
import { RankDistributionPanel } from '@/features/analytics/components/rank-distribution-panel';
import { HeroLeaderboardPanel } from '@/features/heroes/components/hero-leaderboard-panel';
import { ItemLeaderboardPanel } from '@/features/items/components/item-leaderboard-panel';
import { NaLeaderboardPanel } from '@/features/dashboard/components/na-leaderboard-panel';
import { TelemetrySnapshotPanel } from '@/features/dashboard/components/telemetry-snapshot-panel';

export const dashboardPanelRegistry: DashboardPanelRegistry = {
  'telemetry-snapshot': {
    type: 'telemetry-snapshot',
    title: 'Telemetry snapshot',
    description: 'Latest aggregate stats pulled from the Deadlock API.',
    defaultW: 1,
    defaultH: 9,
    minW: 1,
    minH: 9,
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
    title: 'Rank distribution histogram',
    description: 'MMR rank distribution across the sampled timeframe.',
    defaultW: 2,
    defaultH: 13,
    minW: 2,
    minH: 10,
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
    title: 'NA leaderboard highlight',
    description: 'Top accounts pulled from the NA queue.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
    render: ({ data, headerActions }) => (
      <NaLeaderboardPanel
        entries={data.leaderboardEntries}
        headerActions={headerActions}
      />
    ),
  },
  'hero-popularity': {
    type: 'hero-popularity',
    title: 'Hero popularity ranking',
    description: 'Most-played heroes across the tracked sample.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
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
    title: 'Hero winrate ranking',
    description: 'Highest-performing heroes in the current patch.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
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
    title: 'Item popularity ranking',
    description: 'Most purchased items in the tracked sample.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
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
    title: 'Item winrate ranking',
    description: 'Items correlated with the highest win rates.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
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
};

export const defaultDashboardLayout: DashboardPanelInstance[] = [
  { id: 'panel-telemetry', type: 'telemetry-snapshot', x: 0, y: 0, w: 1, h: 9 },
  { id: 'panel-rank-distribution', type: 'rank-distribution', x: 1, y: 0, w: 2, h: 13 },
  { id: 'panel-na-leaderboard', type: 'na-leaderboard', x: 0, y: 9, w: 1, h: 13 },
  { id: 'panel-hero-popularity', type: 'hero-popularity', x: 1, y: 13, w: 1, h: 13 },
  { id: 'panel-hero-winrate', type: 'hero-winrate', x: 2, y: 13, w: 1, h: 13 },
  { id: 'panel-item-popularity', type: 'item-popularity', x: 0, y: 22, w: 1, h: 13 },
  { id: 'panel-item-winrate', type: 'item-winrate', x: 1, y: 26, w: 1, h: 13 },
];
