import type {
  DashboardPanelDefinition,
  DashboardPanelType,
} from '@/features/dashboard/dashboard-types';

type DashboardPanelManifestEntry = Pick<
  DashboardPanelDefinition,
  'title' | 'description' | 'defaultW' | 'defaultH' | 'minW' | 'minH'
>;

export const dashboardPanelManifest = {
  'telemetry-snapshot': {
    title: 'Telemetry snapshot',
    description: 'Latest aggregate stats pulled from the Deadlock API.',
    defaultW: 1,
    defaultH: 9,
    minW: 1,
    minH: 9,
  },
  'rank-distribution': {
    title: 'Rank distribution histogram',
    description: 'MMR rank distribution across the sampled timeframe.',
    defaultW: 2,
    defaultH: 13,
    minW: 2,
    minH: 10,
  },
  'na-leaderboard': {
    title: 'NA leaderboard highlight',
    description: 'Top accounts pulled from the NA queue.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
  'hero-popularity': {
    title: 'Hero popularity ranking',
    description: 'Most-played heroes across the tracked sample.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
  'hero-winrate': {
    title: 'Hero winrate ranking',
    description: 'Highest-performing heroes in the current patch.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
  'item-popularity': {
    title: 'Item popularity ranking',
    description: 'Most purchased items in the tracked sample.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
  'item-winrate': {
    title: 'Item winrate ranking',
    description: 'Items correlated with the highest win rates.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
  'popular-layouts': {
    title: 'Popular layouts',
    description: 'Most-viewed community layouts shared through 618Lock.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 7,
  },
} satisfies Record<DashboardPanelType, DashboardPanelManifestEntry>;
