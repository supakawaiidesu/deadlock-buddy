import type {
  PlayerWidgetInstance,
  PlayerWidgetRegistry,
} from '@/features/player-profile/player-widget-types';
import { HeroPerformancePanel } from '@/features/player-profile/components/hero-performance-panel';
import { MatchHistoryPanel } from '@/features/player-profile/components/match-history-panel';
import { TopHeroesPanel } from '@/features/player-profile/components/top-heroes-panel';

import { createGeometryWidgetLifecycle } from '@/features/widgets/widget-types';
import {
  HistoryWidgetPreview,
  RowsWidgetPreview,
  TableWidgetPreview,
} from '@/features/widgets/components/widget-picker-previews';
export const playerWidgetRegistry: PlayerWidgetRegistry = {
  'hero-performance': {
    type: 'hero-performance',
    title: 'Hero performance',
    preview: (
      <TableWidgetPreview
        headers={['Hero', 'Matches', 'Win', 'Souls/min']}
        rows={[
          ['Haze', '28', '57.1%', '1,168'],
          ['Abrams', '19', '52.6%', '1,092'],
          ['Dynamo', '12', '58.3%', '1,041'],
        ]}
      />
    ),
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
    preview: (
      <HistoryWidgetPreview
        rows={[
          { outcome: 'W', label: 'Haze · Ranked', value: '32:18' },
          { outcome: 'L', label: 'Abrams · Ranked', value: '41:06' },
          { outcome: 'W', label: 'Dynamo · Standard', value: '28:44' },
        ]}
      />
    ),
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
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: '1  Haze', value: '28', meta: '57.1% win rate' },
          { label: '2  Abrams', value: '19', meta: '52.6% win rate' },
          { label: '3  Dynamo', value: '12', meta: '58.3% win rate' },
        ]}
      />
    ),
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

