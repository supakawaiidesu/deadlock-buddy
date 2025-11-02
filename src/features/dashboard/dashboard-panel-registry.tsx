import type {
  DashboardPanelDefinition,
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
    panelKeyBase: 'telemetry-snapshot',
    render: ({ data, headerActions, outerRef }) => (
      <TelemetrySnapshotPanel
        leaderboardSampleSize={data.leaderboardEntries.length}
        heroCount={data.heroCount}
        highestBadge={data.highestBadge}
        heroWinrateEntries={data.heroWinrateEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'rank-distribution': {
    type: 'rank-distribution',
    title: 'Rank distribution histogram',
    description: 'MMR rank distribution across the sampled timeframe.',
    panelKeyBase: 'rank-distribution',
    columnSpan: 2,
    render: ({ data, headerActions, outerRef }) => (
      <RankDistributionPanel
        entries={data.rankDistributionEntries}
        minUnixTimestamp={data.rankDistributionMinUnixTimestamp}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'na-leaderboard': {
    type: 'na-leaderboard',
    title: 'NA leaderboard highlight',
    description: 'Top accounts pulled from the NA queue.',
    panelKeyBase: 'na-leaderboard',
    render: ({ data, headerActions, outerRef }) => (
      <NaLeaderboardPanel
        entries={data.leaderboardEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'hero-popularity': {
    type: 'hero-popularity',
    title: 'Hero popularity ranking',
    description: 'Most-played heroes across the tracked sample.',
    panelKeyBase: 'hero-popularity',
    render: ({ instance, data, headerActions, outerRef }) => (
      <HeroLeaderboardPanel
        title="Hero popularity ranking"
        panelKey={`${'hero-popularity'}-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.heroPopularityEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'hero-winrate': {
    type: 'hero-winrate',
    title: 'Hero winrate ranking',
    description: 'Highest-performing heroes in the current patch.',
    panelKeyBase: 'hero-winrate',
    render: ({ instance, data, headerActions, outerRef }) => (
      <HeroLeaderboardPanel
        title="Hero winrate ranking"
        panelKey={`${'hero-winrate'}-${instance.id}`}
        mode="winrate"
        limit={50}
        initialEntries={data.heroWinrateEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'item-popularity': {
    type: 'item-popularity',
    title: 'Item popularity ranking',
    description: 'Most purchased items in the tracked sample.',
    panelKeyBase: 'item-popularity',
    render: ({ instance, data, headerActions, outerRef }) => (
      <ItemLeaderboardPanel
        title="Item popularity ranking"
        panelKey={`${'item-popularity'}-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.itemPopularityEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'item-winrate': {
    type: 'item-winrate',
    title: 'Item winrate ranking',
    description: 'Items correlated with the highest win rates.',
    panelKeyBase: 'item-winrate',
    render: ({ instance, data, headerActions, outerRef }) => (
      <ItemLeaderboardPanel
        title="Item winrate ranking"
        panelKey={`${'item-winrate'}-${instance.id}`}
        mode="winrate"
        limit={10}
        initialEntries={data.itemWinrateEntries}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
};

export const dashboardPanelsList: DashboardPanelDefinition[] =
  Object.values(dashboardPanelRegistry);

export const defaultDashboardLayout: DashboardPanelInstance[] = [
  { id: 'panel-telemetry', type: 'telemetry-snapshot' },
  { id: 'panel-rank-distribution', type: 'rank-distribution' },
  { id: 'panel-na-leaderboard', type: 'na-leaderboard' },
  { id: 'panel-hero-popularity', type: 'hero-popularity' },
  { id: 'panel-hero-winrate', type: 'hero-winrate' },
  { id: 'panel-item-popularity', type: 'item-popularity' },
  { id: 'panel-item-winrate', type: 'item-winrate' },
];
