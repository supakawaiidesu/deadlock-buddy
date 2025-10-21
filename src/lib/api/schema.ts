import { z } from 'zod';

export const PlayerHeroStatSchema = z.object({
  account_id: z.number(),
  hero_id: z.number(),
  matches_played: z.number(),
  last_played: z.number(),
  time_played: z.number(),
  wins: z.number(),
  ending_level: z.number(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  denies_per_match: z.number(),
  kills_per_min: z.number(),
  deaths_per_min: z.number(),
  assists_per_min: z.number(),
  denies_per_min: z.number(),
  networth_per_min: z.number(),
  last_hits_per_min: z.number(),
  damage_per_min: z.number(),
  damage_per_soul: z.number(),
  damage_mitigated_per_min: z.number(),
  damage_taken_per_min: z.number(),
  damage_taken_per_soul: z.number(),
  creeps_per_min: z.number(),
  obj_damage_per_min: z.number(),
  obj_damage_per_soul: z.number(),
  accuracy: z.number(),
  crit_shot_rate: z.number(),
  matches: z.array(z.number()),
});

export type PlayerHeroStat = z.infer<typeof PlayerHeroStatSchema>;

export const PlayerHeroStatsResponseSchema = z.array(PlayerHeroStatSchema);

export type PlayerHeroStatsResponse = z.infer<typeof PlayerHeroStatsResponseSchema>;

export const PlayerMMREntrySchema = z.object({
  account_id: z.number(),
  match_id: z.number(),
  start_time: z.number(),
  player_score: z.number(),
  rank: z.number().optional().nullable(),
  division: z.number().optional().nullable(),
  division_tier: z.number().optional().nullable(),
});

export type PlayerMMREntry = z.infer<typeof PlayerMMREntrySchema>;
export type PlayerMMR = PlayerMMREntry;

export const PlayerMMRResponseSchema = z.array(PlayerMMREntrySchema);

export const PlayerMMRHistoryResponseSchema = z.array(PlayerMMREntrySchema);

export type PlayerMMRHistory = z.infer<typeof PlayerMMRHistoryResponseSchema>;
