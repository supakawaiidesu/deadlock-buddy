import { describe, expect, it } from 'vitest';
import { buildHeroRows, computeOverallRecord, computeTopHeroes } from '@/features/players/lib/metrics';

describe('player metrics helpers', () => {
  const sampleStats = [
    {
      account_id: 1,
      hero_id: 10,
      matches_played: 20,
      last_played: 1_700_000_000,
      time_played: 0,
      wins: 12,
      ending_level: 0,
      kills: 80,
      deaths: 40,
      assists: 60,
      denies_per_match: 0,
      kills_per_min: 0,
      deaths_per_min: 0,
      assists_per_min: 0,
      denies_per_min: 0,
      networth_per_min: 1100,
      last_hits_per_min: 5,
      damage_per_min: 1200,
      damage_per_soul: 0,
      damage_mitigated_per_min: 0,
      damage_taken_per_min: 0,
      damage_taken_per_soul: 0,
      creeps_per_min: 0,
      obj_damage_per_min: 0,
      obj_damage_per_soul: 0,
      accuracy: 0,
      crit_shot_rate: 0,
      matches: [],
    },
    {
      account_id: 1,
      hero_id: 11,
      matches_played: 8,
      last_played: 1_700_010_000,
      time_played: 0,
      wins: 5,
      ending_level: 0,
      kills: 30,
      deaths: 20,
      assists: 25,
      denies_per_match: 0,
      kills_per_min: 0,
      deaths_per_min: 0,
      assists_per_min: 0,
      denies_per_min: 0,
      networth_per_min: 900,
      last_hits_per_min: 4,
      damage_per_min: 1000,
      damage_per_soul: 0,
      damage_mitigated_per_min: 0,
      damage_taken_per_min: 0,
      damage_taken_per_soul: 0,
      creeps_per_min: 0,
      obj_damage_per_min: 0,
      obj_damage_per_soul: 0,
      accuracy: 0,
      crit_shot_rate: 0,
      matches: [],
    },
  ];

  it('buildHeroRows derives win rate and kda', () => {
    const rows = buildHeroRows(sampleStats);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      heroId: 10,
      matches: 20,
      wins: 12,
      winRate: 0.6,
    });
    expect(rows[0].kda).toBeCloseTo((80 + 60) / 40, 4);
  });

  it('computeTopHeroes sorts by matches and win rate', () => {
    const rows = buildHeroRows(sampleStats);
    const top = computeTopHeroes(rows);
    expect(top[0].heroId).toBe(10);
  });

  it('computeOverallRecord aggregates matches and wins', () => {
    const rows = buildHeroRows(sampleStats);
    const record = computeOverallRecord(rows);
    expect(record.matches).toBe(28);
    expect(record.wins).toBe(17);
    expect(record.winRate).toBeCloseTo(17 / 28);
  });
});

