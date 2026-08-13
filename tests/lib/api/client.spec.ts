import { describe, expect, it } from 'vitest';
import {
  deadlockApiBaseUrl,
  deadlockApiUpstreamBaseUrl,
  isProxiedDeadlockPath,
} from '@/lib/api/client';

describe('deadlock API base routing', () => {
  it('defaults proxy and upstream bases', () => {
    expect(deadlockApiBaseUrl).toBe('https://aldebaran-production.up.railway.app');
    expect(deadlockApiUpstreamBaseUrl).toBe('https://api.deadlock-api.com');
  });

  it.each([
    '/v1/leaderboard/Europe',
    '/v1/analytics/scoreboards/heroes',
    '/v1/analytics/game-stats',
    '/v1/analytics/hero-comb-stats',
    '/v1/analytics/hero-counter-stats',
    '/v1/analytics/item-stats',
    '/v1/analytics/badge-distribution',
    '/v1/players/hero-stats',
    '/v1/players/12345/match-history',
    '/v1/players/12345/match-history?limit=10',
  ])('proxies allowlisted path %s', (path) => {
    expect(isProxiedDeadlockPath(path)).toBe(true);
  });

  it.each([
    '/v1/matches/metadata',
    '/v1/players/steam',
    '/v1/players/steam-search',
    '/v1/players/12345/rank',
    '/v1/players/hero-stats/extra',
    '/v1/analytics/unknown',
    '/steam/lookup',
  ])('keeps non-allowlisted path %s on upstream', (path) => {
    expect(isProxiedDeadlockPath(path)).toBe(false);
  });
});
