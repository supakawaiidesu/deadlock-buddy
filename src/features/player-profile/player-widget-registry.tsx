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
    columnSpan: 2,
    render: ({ data, headerActions, outerRef }) => (
      <HeroPerformancePanel
        accountId={data.accountId}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'profile-signals': {
    type: 'profile-signals',
    title: 'Profile signals',
    description: 'Score, leaderboard rank, lifetime record, and hero spread.',
    render: ({ data, headerActions, outerRef }) => (
      <ProfileSignalsPanel
        accountId={data.accountId}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'match-history': {
    type: 'match-history',
    title: 'Match history',
    description: 'Recent matches with builds, teams, and per-match stats.',
    columnSpan: 2,
    render: ({ data, headerActions, outerRef }) => (
      <MatchHistoryPanel
        accountId={data.accountId}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
  'top-heroes': {
    type: 'top-heroes',
    title: 'Top heroes',
    description: 'Most-played heroes by volume and win rate.',
    render: ({ data, headerActions, outerRef }) => (
      <TopHeroesPanel
        accountId={data.accountId}
        headerActions={headerActions}
        outerRef={outerRef}
      />
    ),
  },
};

export const defaultPlayerWidgetLayout: PlayerWidgetInstance[] = [
  { id: 'player-widget-hero-performance', type: 'hero-performance' },
  { id: 'player-widget-profile-signals', type: 'profile-signals' },
  { id: 'player-widget-match-history', type: 'match-history' },
  { id: 'player-widget-top-heroes', type: 'top-heroes' },
];
