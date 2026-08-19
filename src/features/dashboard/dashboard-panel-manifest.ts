import type {
  DashboardPanelDefinition,
  DashboardPanelType,
} from '@/features/dashboard/dashboard-types';

type DashboardPanelManifestEntry = Pick<
  DashboardPanelDefinition,
  'title' | 'description' | 'defaultW' | 'defaultH'
>;

export const dashboardPanelManifest = {
  'telemetry-snapshot': {
    title: 'Telemetry snapshot',
    description: 'Latest aggregate stats pulled from the Deadlock API.',
    defaultW: 4,
    defaultH: 9,
  },
  'rank-distribution': {
    title: 'Rank distribution histogram',
    description: 'MMR rank distribution across the sampled timeframe.',
    defaultW: 8,
    defaultH: 13,
  },
  'na-leaderboard': {
    title: 'NA leaderboard highlight',
    description: 'Top accounts pulled from the NA queue.',
    defaultW: 4,
    defaultH: 13,
  },
  'hero-popularity': {
    title: 'Hero popularity ranking',
    description: 'Most-played heroes across the tracked sample.',
    defaultW: 4,
    defaultH: 13,
  },
  'hero-winrate': {
    title: 'Hero winrate ranking',
    description: 'Highest-performing heroes in the current patch.',
    defaultW: 4,
    defaultH: 13,
  },
  'hero-winrate-over-time': {
    title: 'Hero win rate over time',
    description: 'Compare hero performance across a filtered match sample.',
    defaultW: 12,
    defaultH: 18,
  },
  'total-matches-over-time': {
    title: 'Game stats over time',
    description: 'Compare multiple daily game stats on one indexed chart.',
    defaultW: 12,
    defaultH: 18,
  },
  'item-popularity': {
    title: 'Item popularity ranking',
    description: 'Most purchased items in the tracked sample.',
    defaultW: 4,
    defaultH: 13,
  },
  'item-winrate': {
    title: 'Item winrate ranking',
    description: 'Items correlated with the highest win rates.',
    defaultW: 4,
    defaultH: 13,
  },
  'popular-layouts': {
    title: 'Popular layouts',
    description: 'Most-viewed community layouts shared through 618Lock.',
    defaultW: 4,
    defaultH: 13,
  },
} satisfies Record<DashboardPanelType, DashboardPanelManifestEntry>;
