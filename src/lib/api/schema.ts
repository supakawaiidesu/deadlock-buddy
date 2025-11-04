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

const NumberArraySchema = z
  .union([
    z.array(z.union([z.number(), z.string()])),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (!value) return [];
    return value
      .map((item) => {
        if (typeof item === 'number' && Number.isFinite(item)) return item;
        if (typeof item === 'string') {
          const parsed = Number(item);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      })
      .filter((item): item is number => item !== null);
  });

const NullableNumberSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const LeaderboardEntryBaseSchema = z
  .object({
    account_name: z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      return 'Unknown Player';
    }),
    possible_account_ids: NumberArraySchema,
    rank: z.coerce.number(),
    top_hero_ids: NumberArraySchema,
    badge_level: NullableNumberSchema,
    ranked_rank: NullableNumberSchema,
    ranked_subrank: NullableNumberSchema,
  })
  .passthrough();

export const LeaderboardEntrySchema = LeaderboardEntryBaseSchema.transform((entry) => ({
  ...entry,
  possible_account_ids: entry.possible_account_ids ?? [],
  top_hero_ids: entry.top_hero_ids ?? [],
  badge_level: entry.badge_level,
  ranked_rank: entry.ranked_rank,
  ranked_subrank: entry.ranked_subrank,
}));

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

const LeaderboardEntryArraySchema = z.array(LeaderboardEntrySchema);

const LeaderboardEntryWrappedSchemas = [
  z.object({
    data: LeaderboardEntryArraySchema,
  }),
  z.object({
    leaderboard: LeaderboardEntryArraySchema,
  }),
  z.object({
    entries: LeaderboardEntryArraySchema,
  }),
  z.object({
    result: z.object({
      data: LeaderboardEntryArraySchema.optional(),
      leaderboard: LeaderboardEntryArraySchema.optional(),
      entries: LeaderboardEntryArraySchema.optional(),
    }),
  }),
] as const;

const LeaderboardResponseSchemaUnion = z.union([
  LeaderboardEntryArraySchema,
  ...LeaderboardEntryWrappedSchemas.map((schema) =>
    schema.transform((value) => {
      if ('data' in value && Array.isArray(value.data)) {
        return value.data;
      }
      if ('leaderboard' in value && Array.isArray(value.leaderboard)) {
        return value.leaderboard;
      }
      if ('entries' in value && Array.isArray(value.entries)) {
        return value.entries;
      }
      if ('result' in value) {
        const { result } = value;
        if (result?.data && Array.isArray(result.data)) return result.data;
        if (result?.leaderboard && Array.isArray(result.leaderboard)) return result.leaderboard;
        if (result?.entries && Array.isArray(result.entries)) return result.entries;
      }
      return [];
    }),
  ),
]);

export const LeaderboardEntryResponseSchema = LeaderboardResponseSchemaUnion.transform((value) =>
  Array.isArray(value) ? value : [],
);

export const HeroScoreboardEntrySchema = z.object({
  rank: z.number(),
  hero_id: z.number(),
  value: z.number(),
  matches: z.number(),
});

export type HeroScoreboardEntry = z.infer<typeof HeroScoreboardEntrySchema>;

export const HeroScoreboardResponseSchema = z.array(HeroScoreboardEntrySchema);

export const HeroStatsEntrySchema = z
  .object({
    hero_id: z.number(),
    bucket: z.number().optional().nullable(),
    wins: z.number().optional().nullable(),
    losses: z.number().optional().nullable(),
    matches: z.number().optional().nullable(),
    matches_per_bucket: z.number().optional().nullable(),
    players: z.number().optional().nullable(),
    total_kills: z.number().optional().nullable(),
    total_deaths: z.number().optional().nullable(),
    total_assists: z.number().optional().nullable(),
    total_net_worth: z.number().optional().nullable(),
    total_last_hits: z.number().optional().nullable(),
    total_denies: z.number().optional().nullable(),
    total_player_damage: z.number().optional().nullable(),
    total_player_damage_taken: z.number().optional().nullable(),
    total_boss_damage: z.number().optional().nullable(),
    total_creep_damage: z.number().optional().nullable(),
    total_neutral_damage: z.number().optional().nullable(),
    total_max_health: z.number().optional().nullable(),
    total_shots_hit: z.number().optional().nullable(),
    total_shots_missed: z.number().optional().nullable(),
  })
  .passthrough();

export type HeroStatsEntry = z.infer<typeof HeroStatsEntrySchema>;

export const HeroStatsResponseSchema = z.array(HeroStatsEntrySchema);

export const ItemStatsEntrySchema = z
  .object({
    item_id: z.number(),
    bucket: z.number().optional().nullable(),
    wins: z.number(),
    losses: z.number().optional().nullable(),
    matches: z.number().optional().nullable(),
    players: z.number().optional().nullable(),
  })
  .passthrough();

export type ItemStatsEntry = z.infer<typeof ItemStatsEntrySchema>;

export const ItemStatsResponseSchema = z.array(ItemStatsEntrySchema);

export const RankDistributionEntrySchema = z.object({
  rank: z.coerce.number(),
  players: z.coerce.number(),
});

export type RankDistributionEntry = z.infer<typeof RankDistributionEntrySchema>;

export const RankDistributionResponseSchema = z.array(RankDistributionEntrySchema);
