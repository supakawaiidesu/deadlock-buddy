import { describe, expect, it } from 'vitest';
import { aggregateDailyActivity } from '@/features/player-profile/lib/match-activity';
import type { PlayerMatchHistoryEntry } from '@/lib/api/schema';

/** 2026-08-03T12:00:00Z — fixed so the 30-day window is deterministic. */
const NOW = Date.UTC(2026, 7, 3, 12, 0, 0);

function match(
  overrides: Partial<PlayerMatchHistoryEntry> & { start_time: number },
): PlayerMatchHistoryEntry {
  return {
    match_id: 1,
    match_result: 0,
    player_team: 0,
    match_duration_s: null,
    ...overrides,
  } as PlayerMatchHistoryEntry;
}

/** Unix seconds for midday on a given UTC date. */
function at(year: number, monthIndex: number, day: number): number {
  return Date.UTC(year, monthIndex, day, 12, 0, 0) / 1000;
}

describe('aggregateDailyActivity', () => {
  it('returns one entry per requested day, oldest first', () => {
    const days = aggregateDailyActivity([], 30, NOW);

    expect(days).toHaveLength(30);
    expect(days[0].date).toBe('2026-07-05');
    expect(days[29].date).toBe('2026-08-03');
  });

  it('counts a win when match_result equals player_team', () => {
    const days = aggregateDailyActivity(
      [match({ start_time: at(2026, 7, 3), match_result: 1, player_team: 1 })],
      30,
      NOW,
    );
    const today = days[29];

    expect(today.wins).toBe(1);
    expect(today.losses).toBe(0);
    expect(today.winRate).toBe(1);
    expect(today.durationSeconds).toBe(0);
  });

  it('counts a loss when match_result differs from player_team', () => {
    const days = aggregateDailyActivity(
      [match({ start_time: at(2026, 7, 3), match_result: 0, player_team: 1 })],
      30,
      NOW,
    );
    const today = days[29];

    expect(today.wins).toBe(0);
    expect(today.losses).toBe(1);
    expect(today.winRate).toBe(0);
    expect(today.durationSeconds).toBe(0);
  });

  it('buckets multiple matches on the same UTC day together', () => {
    const days = aggregateDailyActivity(
      [
        match({ match_id: 1, start_time: at(2026, 7, 1), match_result: 1, player_team: 1 }),
        match({ match_id: 2, start_time: at(2026, 7, 1), match_result: 1, player_team: 1 }),
        match({ match_id: 3, start_time: at(2026, 7, 1), match_result: 0, player_team: 1 }),
      ],
      30,
      NOW,
    );
    const day = days.find((entry) => entry.date === '2026-08-01');

    expect(day).toBeDefined();
    expect(day?.wins).toBe(2);
    expect(day?.losses).toBe(1);
    expect(day?.total).toBe(3);
    expect(day?.winRate).toBeCloseTo(2 / 3);
    expect(day?.durationSeconds).toBe(0);
  });

  it('sums match duration per day', () => {
    const days = aggregateDailyActivity(
      [
        match({ start_time: at(2026, 7, 3), match_result: 1, player_team: 1, match_duration_s: 1200 }),
        match({ start_time: at(2026, 7, 3), match_result: 1, player_team: 1, match_duration_s: 1800 }),
      ],
      30,
      NOW,
    );

    expect(days[29].durationSeconds).toBe(3000);
  });

  it('zero-fills days without matches', () => {
    const days = aggregateDailyActivity(
      [match({ start_time: at(2026, 7, 3), match_result: 1, player_team: 1 })],
      30,
      NOW,
    );
    const idle = days[0];

    expect(idle.total).toBe(0);
    expect(idle.wins).toBe(0);
    expect(idle.losses).toBe(0);
    expect(idle.winRate).toBe(0);
    expect(idle.durationSeconds).toBe(0);
  });

  it('excludes matches older than the requested window', () => {
    const days = aggregateDailyActivity(
      [match({ start_time: at(2026, 0, 1), match_result: 1, player_team: 1 })],
      30,
      NOW,
    );

    expect(days.reduce((sum, day) => sum + day.total, 0)).toBe(0);
  });

  it('skips entries missing the fields the win test needs', () => {
    const days = aggregateDailyActivity(
      [
        match({ start_time: at(2026, 7, 3), match_result: null, player_team: 1 }),
        match({ start_time: at(2026, 7, 3), match_result: 1, player_team: null }),
      ],
      30,
      NOW,
    );

    expect(days[29].total).toBe(0);
  });

  it('does not mutate the input array', () => {
    const input = [match({ start_time: at(2026, 7, 3), match_result: 1, player_team: 1 })];
    const snapshot = [...input];

    aggregateDailyActivity(input, 30, NOW);

    expect(input).toEqual(snapshot);
  });
});
