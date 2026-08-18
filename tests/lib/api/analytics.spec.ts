import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsGameStatsRow } from '../../fixtures/analytics-game-stats';
import { fetchGameStats, fetchHeroStats } from '@/lib/api/analytics';

const completeRow = {
  hero_id: 1,
  bucket: 1_700_000_000,
  wins: 12,
  losses: 8,
  matches: 20,
  matches_per_bucket: 20,
  total_kills: 120,
  total_deaths: 80,
  total_assists: 200,
  total_net_worth: 1_000_000,
  total_last_hits: 4_000,
  total_denies: 500,
  total_player_damage: 2_000_000,
  total_player_damage_taken: 1_500_000,
  total_boss_damage: 300_000,
  total_creep_damage: 900_000,
  total_neutral_damage: 600_000,
  total_max_health: 100_000,
  total_shots_hit: 50_000,
  total_shots_missed: 25_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchHeroStats', () => {
  it('uses upstream and serializes the exact fixed and filter query', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([completeRow]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchStub);

    const result = await fetchHeroStats({
      minUnixTimestamp: 1_699_000_000,
      minAverageBadge: 91,
      maxAverageBadge: 116,
    });

    expect(result).toEqual([completeRow]);
    expect(fetchStub).toHaveBeenCalledOnce();
    const url = new URL(String(fetchStub.mock.calls[0]?.[0]));
    expect(url.origin).toBe('https://api.deadlock-api.com');
    expect(url.pathname).toBe('/v1/analytics/hero-stats');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      bucket: 'start_time_day',
      game_mode: 'normal',
      match_mode: 'ranked,unranked',
      min_unix_timestamp: '1699000000',
      min_average_badge: '91',
      max_average_badge: '116',
      min_hero_matches: '0',
      min_hero_matches_total: '0',
    });
    expect(url.searchParams.has('hero_id')).toBe(false);
    expect(url.searchParams.has('hero_ids')).toBe(false);
  });

  it('rejects malformed upstream rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ ...completeRow, matches: '20' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(
      fetchHeroStats({
        minUnixTimestamp: 1_699_000_000,
        minAverageBadge: 91,
        maxAverageBadge: 116,
      }),
    ).rejects.toThrow();
  });
});

describe('fetchGameStats', () => {
  it('uses the proxy and serializes the exact fixed and filter query', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([analyticsGameStatsRow]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchStub);

    const result = await fetchGameStats({
      minUnixTimestamp: 1_785_430_800,
      minAverageBadge: 0,
      maxAverageBadge: 116,
    });

    expect(result).toEqual([analyticsGameStatsRow]);
    expect(result[0]).toMatchObject({
      avg_kills: analyticsGameStatsRow.avg_kills,
      team1_wins: analyticsGameStatsRow.team1_wins,
    });
    expect(fetchStub).toHaveBeenCalledOnce();
    const url = new URL(String(fetchStub.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://aldebaran-production.up.railway.app/v1/analytics/game-stats',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      bucket: 'start_time_day',
      game_mode: 'normal',
      match_mode: 'ranked,unranked',
      min_unix_timestamp: '1785430800',
      min_average_badge: '0',
      max_average_badge: '116',
    });
    expect(url.searchParams.has('metric')).toBe(false);
    expect(url.searchParams.has('metrics')).toBe(false);
  });

  it.each([
    ['missing avg_kills', { ...analyticsGameStatsRow, avg_kills: undefined }],
    ['string total_matches', { ...analyticsGameStatsRow, total_matches: '75000' }],
  ])('rejects %s', async (_case, row) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([row]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(fetchGameStats({
      minUnixTimestamp: 1_785_430_800,
      minAverageBadge: 0,
      maxAverageBadge: 116,
    })).rejects.toThrow();
  });
});
