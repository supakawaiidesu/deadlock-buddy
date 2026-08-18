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
    defaultW: 8,
    defaultH: 13,
    ...createGeometryWidgetLifecycle('hero-performance'),
    render: ({ data, headerActions, size }) => data ? (
      <HeroPerformancePanel accountId={data.accountId} headerActions={headerActions} size={size} />
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
    defaultW: 8,
    defaultH: 18,
    ...createGeometryWidgetLifecycle('match-history'),
    render: ({ data, headerActions, size }) => data ? (
      <MatchHistoryPanel accountId={data.accountId} headerActions={headerActions} size={size} />
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
    defaultW: 4,
    defaultH: 11,
    ...createGeometryWidgetLifecycle('top-heroes'),
    render: ({ data, headerActions, size }) => data ? (
      <TopHeroesPanel accountId={data.accountId} headerActions={headerActions} size={size} />
    ) : null,
  },
};

export const defaultPlayerWidgetLayout: PlayerWidgetInstance[] = [
  { id: 'player-widget-top-heroes', type: 'top-heroes', x: 0, y: 0, w: 4, h: 11 },
  { id: 'player-widget-hero-performance', type: 'hero-performance', x: 4, y: 0, w: 8, h: 13 },
  { id: 'player-widget-match-history', type: 'match-history', x: 4, y: 13, w: 8, h: 18 },
];

