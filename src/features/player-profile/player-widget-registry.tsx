import type {
  PlayerWidgetInstance,
  PlayerWidgetRegistry,
} from '@/features/player-profile/player-widget-types';
import { HeroPerformancePanel } from '@/features/player-profile/components/hero-performance-panel';
import { ProfileSignalsPanel } from '@/features/player-profile/components/profile-signals-panel';
import { MatchHistoryPanel } from '@/features/player-profile/components/match-history-panel';
import { TopHeroesPanel } from '@/features/player-profile/components/top-heroes-panel';

export const playerWidgetRegistry: PlayerWidgetRegistry = {
  'hero-performance': {
    type: 'hero-performance',
    title: 'Hero performance',
    description: 'Per-hero matches, win rate, and per-minute economy.',
    defaultW: 2,
    defaultH: 13,
    minW: 1,
    minH: 8,
    render: ({ data, headerActions }) => (
      <HeroPerformancePanel
        accountId={data.accountId}
        headerActions={headerActions}
      />
    ),
  },
  'profile-signals': {
    type: 'profile-signals',
    title: 'Profile signals',
    description: 'Score, leaderboard rank, lifetime record, and hero spread.',
    defaultW: 1,
    defaultH: 13,
    minW: 1,
    minH: 8,
    render: ({ data, headerActions }) => (
      <ProfileSignalsPanel
        accountId={data.accountId}
        headerActions={headerActions}
      />
    ),
  },
  'match-history': {
    type: 'match-history',
    title: 'Match history',
    description: 'Recent matches with builds, teams, and per-match stats.',
    defaultW: 2,
    defaultH: 18,
    minW: 1,
    minH: 10,
    render: ({ data, headerActions }) => (
      <MatchHistoryPanel
        accountId={data.accountId}
        headerActions={headerActions}
      />
    ),
  },
  'top-heroes': {
    type: 'top-heroes',
    title: 'Top heroes',
    description: 'Most-played heroes by volume and win rate.',
    defaultW: 1,
    defaultH: 11,
    minW: 1,
    minH: 6,
    render: ({ data, headerActions }) => (
      <TopHeroesPanel
        accountId={data.accountId}
        headerActions={headerActions}
      />
    ),
  },
};

export const defaultPlayerWidgetLayout: PlayerWidgetInstance[] = [
  { id: 'player-widget-top-heroes', type: 'top-heroes', x: 0, y: 0, w: 1, h: 11 },
  { id: 'player-widget-hero-performance', type: 'hero-performance', x: 1, y: 0, w: 2, h: 13 },
  { id: 'player-widget-profile-signals', type: 'profile-signals', x: 0, y: 11, w: 1, h: 13 },
  { id: 'player-widget-match-history', type: 'match-history', x: 1, y: 13, w: 2, h: 18 },
];
