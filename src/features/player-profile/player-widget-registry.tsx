import type {
  PlayerWidgetInstance,
  PlayerWidgetRegistry,
} from '@/features/player-profile/player-widget-types';
import { HeroPerformancePanel } from '@/features/player-profile/components/hero-performance-panel';
import { MatchHistoryPanel } from '@/features/player-profile/components/match-history-panel';
import { TopHeroesPanel } from '@/features/player-profile/components/top-heroes-panel';

import { createGeometryWidgetLifecycle } from '@/features/widgets/widget-types';
export const playerWidgetRegistry: PlayerWidgetRegistry = {
  'hero-performance': {
    type: 'hero-performance',
    title: 'Hero performance',
    description: 'Per-hero matches, win rate, and per-minute economy.',
    defaultW: 2,
    defaultH: 13,
    minW: 1,
    minH: 8,
    ...createGeometryWidgetLifecycle('hero-performance'),
    render: ({ data, headerActions }) => data ? (
      <HeroPerformancePanel accountId={data.accountId} headerActions={headerActions} />
    ) : null,
  },
  'match-history': {
    type: 'match-history',
    title: 'Match history',
    description: 'Recent matches with builds, teams, and per-match stats.',
    defaultW: 2,
    defaultH: 18,
    minW: 1,
    minH: 10,
    ...createGeometryWidgetLifecycle('match-history'),
    render: ({ data, headerActions }) => data ? (
      <MatchHistoryPanel accountId={data.accountId} headerActions={headerActions} />
    ) : null,
  },
  'top-heroes': {
    type: 'top-heroes',
    title: 'Top heroes',
    description: 'Most-played heroes by volume and win rate.',
    defaultW: 1,
    defaultH: 11,
    minW: 1,
    minH: 6,
    ...createGeometryWidgetLifecycle('top-heroes'),
    render: ({ data, headerActions }) => data ? (
      <TopHeroesPanel accountId={data.accountId} headerActions={headerActions} />
    ) : null,
  },
};

export const defaultPlayerWidgetLayout: PlayerWidgetInstance[] = [
  { id: 'player-widget-top-heroes', type: 'top-heroes', x: 0, y: 0, w: 1, h: 11 },
  { id: 'player-widget-hero-performance', type: 'hero-performance', x: 1, y: 0, w: 2, h: 13 },
  { id: 'player-widget-match-history', type: 'match-history', x: 1, y: 13, w: 2, h: 18 },
];

