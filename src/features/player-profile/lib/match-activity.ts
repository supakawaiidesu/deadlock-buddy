import type { PlayerMatchHistoryEntry } from '@/lib/api/schema';

export type DayActivity = {
  /** YYYY-MM-DD date key. */
  date: string;
  /** Unix timestamp for the start of the day (midnight UTC). */
  dayStart: number;
  wins: number;
  losses: number;
  total: number;
  /** Total match time for the day, in seconds. */
  durationSeconds: number;
  /** Win rate for the day, 0-1. */
  winRate: number;
};

/**
 * Aggregate match history into daily win/loss buckets for the last N days.
 *
 * Matches are bucketed by UTC day (start_time floored to midnight UTC). Days
 * with zero matches are included so the heatmap grid remains full. The returned
 * array is sorted ascending (oldest first) to match GitHub-style left-to-right
 * rendering.
 *
 * Win test: `match_result === player_team`. `player_match_outcome` is unset on
 * 96% of rows and is not used.
 *
 * `now` is injectable so the day window is deterministic under test.
 */
export function aggregateDailyActivity(
  matches: readonly PlayerMatchHistoryEntry[],
  days: number,
  now: number = Date.now(),
): DayActivity[] {
  const msPerDay = 24 * 60 * 60 * 1000;

  // Build a map of YYYY-MM-DD -> { wins, losses }.
  const buckets = new Map<string, { wins: number; losses: number; durationSeconds: number }>();

  for (const match of matches) {
    if (
      typeof match.start_time !== 'number' ||
      typeof match.match_result !== 'number' ||
      typeof match.player_team !== 'number'
    ) {
      continue;
    }

    const matchDate = new Date(match.start_time * 1000);
    const dayStart = new Date(
      Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), matchDate.getUTCDate()),
    );
    const dateKey = dayStart.toISOString().slice(0, 10);

    let bucket = buckets.get(dateKey);
    if (!bucket) {
      bucket = { wins: 0, losses: 0, durationSeconds: 0 };
      buckets.set(dateKey, bucket);
    }

    bucket.durationSeconds += match.match_duration_s ?? 0;

    if (match.match_result === match.player_team) {
      bucket.wins += 1;
    } else {
      bucket.losses += 1;
    }
  }

  // Generate the last N days, including days with zero matches.
  const result: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(now - i * msPerDay);
    const utcDayStart = new Date(
      Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate()),
    );
    const dateKey = utcDayStart.toISOString().slice(0, 10);

    const bucket = buckets.get(dateKey) ?? { wins: 0, losses: 0, durationSeconds: 0 };
    const total = bucket.wins + bucket.losses;

    result.push({
      date: dateKey,
      dayStart: utcDayStart.getTime() / 1000,
      wins: bucket.wins,
      losses: bucket.losses,
      total,
      durationSeconds: bucket.durationSeconds,
      winRate: total > 0 ? bucket.wins / total : 0,
    });
  }

  return result;
}
