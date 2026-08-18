import { z } from 'zod';
import { heroSummaries } from '@/lib/data/heroes';

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

export const BadgeDistributionEntrySchema = z.object({
  badge_level: z.coerce.number(),
  total_matches: z.coerce.number(),
  unique_players: z.coerce.number(),
});

export type BadgeDistributionEntry = z.infer<typeof BadgeDistributionEntrySchema>;

export const BadgeDistributionResponseSchema = z.array(BadgeDistributionEntrySchema);


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

const NonnegativeIntegerSchema = z.number().int().nonnegative();

export const AnalyticsHeroStatsSchema = z.object({
  hero_id: NonnegativeIntegerSchema,
  bucket: NonnegativeIntegerSchema,
  wins: NonnegativeIntegerSchema,
  losses: NonnegativeIntegerSchema,
  matches: NonnegativeIntegerSchema,
  matches_per_bucket: NonnegativeIntegerSchema,
  total_kills: NonnegativeIntegerSchema,
  total_deaths: NonnegativeIntegerSchema,
  total_assists: NonnegativeIntegerSchema,
  total_net_worth: NonnegativeIntegerSchema,
  total_last_hits: NonnegativeIntegerSchema,
  total_denies: NonnegativeIntegerSchema,
  total_player_damage: NonnegativeIntegerSchema,
  total_player_damage_taken: NonnegativeIntegerSchema,
  total_boss_damage: NonnegativeIntegerSchema,
  total_creep_damage: NonnegativeIntegerSchema,
  total_neutral_damage: NonnegativeIntegerSchema,
  total_max_health: NonnegativeIntegerSchema,
  total_shots_hit: NonnegativeIntegerSchema,
  total_shots_missed: NonnegativeIntegerSchema,
});

export type AnalyticsHeroStats = z.infer<typeof AnalyticsHeroStatsSchema>;

export const AnalyticsHeroStatsResponseSchema = z.array(AnalyticsHeroStatsSchema);

export const AnalyticsGameStatsSchema = z.object({
  bucket: NonnegativeIntegerSchema,
  total_matches: NonnegativeIntegerSchema,
  total_players: NonnegativeIntegerSchema,
  team0_wins: NonnegativeIntegerSchema,
  team1_wins: NonnegativeIntegerSchema,
  avg_duration_s: z.number(),
  avg_kills: z.number(),
  avg_deaths: z.number(),
  avg_assists: z.number(),
  avg_kd_ratio: z.number(),
  avg_net_worth: z.number(),
  avg_last_hits: z.number(),
  avg_denies: z.number(),
  avg_player_damage: z.number(),
  avg_player_damage_taken: z.number(),
  avg_boss_damage: z.number(),
  avg_player_healing: z.number(),
  avg_accuracy: z.number(),
  avg_crit_rate: z.number(),
  avg_ending_level: z.number(),
  avg_gold_player: z.number(),
  avg_gold_player_orbs: z.number(),
  avg_gold_lane_creep: z.number(),
  avg_gold_lane_creep_orbs: z.number(),
  avg_gold_neutral_creep: z.number(),
  avg_gold_neutral_creep_orbs: z.number(),
  avg_gold_boss: z.number(),
  avg_gold_boss_orb: z.number(),
  avg_gold_treasure: z.number(),
  avg_gold_denied: z.number(),
  avg_gold_death_loss: z.number(),
  avg_creep_damage: z.number(),
  avg_neutral_damage: z.number(),
  avg_self_healing: z.number(),
  avg_damage_mitigated: z.number(),
  avg_damage_absorbed: z.number(),
  avg_heal_prevented: z.number(),
  avg_creep_kills: z.number(),
  avg_neutral_kills: z.number(),
  avg_possible_creeps: z.number(),
  avg_max_health: z.number(),
  avg_weapon_power: z.number(),
  avg_tech_power: z.number(),
  avg_first_mid_boss_time_s: z.number(),
  avg_first_objective_destroyed_time_s: z.number(),
  mid_boss_kill_rate: z.number(),
  abandon_rate: z.number(),
});

export type AnalyticsGameStats = z.infer<typeof AnalyticsGameStatsSchema>;

export const AnalyticsGameStatsResponseSchema = z.array(AnalyticsGameStatsSchema);


export const PlayerRankSchema = z
  .object({
    badge: NullableNumberSchema,
    rank: NullableNumberSchema,
    subrank: NullableNumberSchema,
  })
  .passthrough();

export type PlayerRank = z.infer<typeof PlayerRankSchema>;

/**
 * A single entry from `/v1/players/{id}/match-history`.
 *
 * `player_match_outcome` is unset (`0`) on the overwhelming majority of rows, so
 * the win test compares `match_result` against `player_team` instead.
 */
export const PlayerMatchHistoryEntrySchema = z
  .object({
    account_id: NullableNumberSchema,
    match_id: z.number(),
    hero_id: NullableNumberSchema,
    hero_level: NullableNumberSchema,
    start_time: z.number(),
    game_mode: NullableNumberSchema,
    match_mode: NullableNumberSchema,
    player_kills: NullableNumberSchema,
    player_deaths: NullableNumberSchema,
    player_assists: NullableNumberSchema,
    last_hits: NullableNumberSchema,
    net_worth: NullableNumberSchema,
    match_duration_s: NullableNumberSchema,
    match_result: NullableNumberSchema,
    player_team: NullableNumberSchema,
  })
  .passthrough();

export type PlayerMatchHistoryEntry = z.infer<typeof PlayerMatchHistoryEntrySchema>;

export const PlayerMatchHistoryResponseSchema = z.array(PlayerMatchHistoryEntrySchema);
const NullableStringSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const MatchMetadataItemSchema = z
  .object({
    flags: z.number(),
    game_time_s: z.number(),
    item_id: z.number(),
  })
  .passthrough();

export type MatchMetadataItem = z.infer<typeof MatchMetadataItemSchema>;

const MatchFinalStatsSchema = z
  .object({
    assists: NullableNumberSchema,
    deaths: NullableNumberSchema,
    kills: NullableNumberSchema,
    creep_kills: NullableNumberSchema,
    hero_bullets_hit: NullableNumberSchema,
    hero_bullets_hit_crit: NullableNumberSchema,
    net_worth: NullableNumberSchema,
    time_stamp_s: NullableNumberSchema,
  })
  .passthrough();

export type MatchFinalStats = z.infer<typeof MatchFinalStatsSchema>;

export const MatchMetadataPlayerSchema = z
  .object({
    account_id: z.number(),
    hero_id: NullableNumberSchema,
    final_stats: MatchFinalStatsSchema.nullable().optional(),
    items: z
      .union([z.array(MatchMetadataItemSchema), z.null(), z.undefined()])
      .transform((value) => value ?? []),
    player_slot: NullableNumberSchema,
    team: NullableStringSchema,
  })
  .passthrough();

export type MatchMetadataPlayer = z.infer<typeof MatchMetadataPlayerSchema>;

export const MatchMetadataSchema = z
  .object({
    match_id: z.number(),
    start_time: NullableStringSchema,
    winning_team: NullableStringSchema,
    duration_s: NullableNumberSchema,
    match_outcome: NullableStringSchema,
    match_mode: NullableStringSchema,
    game_mode: NullableStringSchema,
    players: z
      .union([z.array(MatchMetadataPlayerSchema), z.null(), z.undefined()])
      .transform((value) => value ?? []),
    banned_hero_ids: NumberArraySchema,
  })
  .passthrough();

export type MatchMetadata = z.infer<typeof MatchMetadataSchema>;

export const MatchMetadataResponseSchema = z.array(MatchMetadataSchema);

export const PlayerSteamProfileSchema = z
  .object({
    account_id: z.number(),
    personaname: NullableStringSchema,
  })
  .transform(({ account_id, personaname }) => ({ account_id, personaname }));

export type PlayerSteamProfile = z.infer<typeof PlayerSteamProfileSchema>;

export const PlayerSteamProfilesResponseSchema = z.array(PlayerSteamProfileSchema);
export const PlayerSteamSearchResultSchema = z
  .object({
    account_id: z.number(),
    personaname: z.string(),
    profileurl: z.string(),
    avatar: z.string(),
    avatarmedium: z.string(),
    avatarfull: z.string(),
  })
  .passthrough();

export type PlayerSteamSearchResult = z.infer<typeof PlayerSteamSearchResultSchema>;

export const PlayerSteamSearchResponseSchema = z.array(PlayerSteamSearchResultSchema);

export type PlayerSteamSearchResponse = z.infer<typeof PlayerSteamSearchResponseSchema>;


export const SteamProfileSchema = z.object({
  account_id: z.number(),
  steam_id_64: z.string(),
  persona_name: z.string(),
  real_name: z.string().nullable(),
  profile_url: z.string(),
  avatar_url: z.string(),
  avatar_full_url: z.string(),
  country_code: z.string().nullable(),
  visibility: z.string(),
  time_created: z.number().nullable(),
  vac_banned: z.boolean().nullable(),
  vac_ban_count: z.number().nullable(),
  game_ban_count: z.number().nullable(),
  community_banned: z.boolean().nullable(),
  economy_ban: z.string().nullable(),
  days_since_last_ban: z.number().nullable(),
  fetched_at: z.number(),
}).passthrough();

export type SteamProfile = z.infer<typeof SteamProfileSchema>;
export const SteamLookupResponseSchema = z
  .object({
    input: z.string(),
    input_format: z.string(),
    profile: SteamProfileSchema,
  })
  .passthrough();

export type SteamLookupResponse = z.infer<typeof SteamLookupResponseSchema>;


export const SteamProfilesResponseSchema = z.object({
  profiles: z.array(SteamProfileSchema),
});

const codePointLength = (value: string) => Array.from(value).length;

export const ShareIdSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{21,44}$/);

export const ShareNameSchema = z
  .string()
  .refine((value) => value === value.trim().replace(/\s+/gu, ' '))
  .refine((value) => {
    const length = codePointLength(value);
    return length >= 1 && length <= 80;
  });

const ShareWidgetTypeSchema = z.enum([
  'telemetry-snapshot',
  'rank-distribution',
  'na-leaderboard',
  'hero-popularity',
  'hero-winrate',
  'item-popularity',
  'item-winrate',
  'popular-layouts',
]);

const shareHeroIds = new Set(heroSummaries.map((hero) => hero.id));
const ShareWidgetGeometrySchema = z.object({
  id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  x: z.number().int().min(0).max(10_000),
  y: z.number().int().min(0).max(10_000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(1_000),
});

const GeometryShareWidgetSchema = ShareWidgetGeometrySchema.extend({
  type: ShareWidgetTypeSchema,
}).strict();

export const AnalyticsTimeSeriesFilterSettingsSchema = z
  .object({
    minUnixTimestamp: z.number().int().positive().safe(),
    minAverageBadge: z.number().int().min(0).max(116).safe(),
    maxAverageBadge: z.number().int().min(0).max(116).safe(),
  })
  .strict()
  .refine((settings) => settings.minAverageBadge <= settings.maxAverageBadge);

export const HeroWinrateOverTimeSettingsSchema = AnalyticsTimeSeriesFilterSettingsSchema.safeExtend({
  heroIds: z.array(z.number().int().refine((id) => shareHeroIds.has(id))).min(1).max(8).refine(
    (ids) => new Set(ids).size === ids.length,
  ),
});

const HeroWinrateOverTimeShareWidgetSchema = ShareWidgetGeometrySchema.extend({
  type: z.literal('hero-winrate-over-time'),
  settings: HeroWinrateOverTimeSettingsSchema,
}).strict();

const TotalMatchesOverTimeShareWidgetSchema = ShareWidgetGeometrySchema.extend({
  type: z.literal('total-matches-over-time'),
  settings: AnalyticsTimeSeriesFilterSettingsSchema,
}).strict();

const ShareWidgetSchema = z.discriminatedUnion('type', [
  GeometryShareWidgetSchema,
  HeroWinrateOverTimeShareWidgetSchema,
  TotalMatchesOverTimeShareWidgetSchema,
]);

const SharePageV2Schema = z
  .object({
    title: z
      .string()
      .refine((value) => value === value.trim())
      .refine((value) => {
        const length = codePointLength(value);
        return length >= 1 && length <= 40;
      }),
    widgets: z.array(GeometryShareWidgetSchema).max(64),
  })
  .strict()
  .refine((page) => new Set(page.widgets.map((widget) => widget.id)).size === page.widgets.length);

const SharePageV3Schema = SharePageV2Schema.safeExtend({
  widgets: z.array(ShareWidgetSchema).max(64),
});

export const ShareProfileV2Schema = z
  .object({
    version: z.literal(2),
    pages: z.array(SharePageV2Schema).min(1).max(64),
  })
  .strict();

export const ShareProfileV3Schema = z
  .object({
    version: z.literal(3),
    pages: z.array(SharePageV3Schema).min(1).max(64),
  })
  .strict();

export const ShareProfileSchema = z.discriminatedUnion('version', [
  ShareProfileV2Schema,
  ShareProfileV3Schema,
]);

export const ShareDocumentV2Schema = z
  .object({ name: ShareNameSchema, profile: ShareProfileV2Schema })
  .strict();

export const ShareDocumentV3Schema = z
  .object({ name: ShareNameSchema, profile: ShareProfileV3Schema })
  .strict();
const ShareSlugSchema = z.string().min(1).refine((slug) => !/[/?#]/u.test(slug));

const ShareBytesSchema = z
  .object({
    raw: z.number().int().nonnegative(),
    compressed: z.number().int().nonnegative(),
  })
  .strict();

const ShareResourceSchema = z
  .object({
    id: ShareIdSchema,
    name: ShareNameSchema,
    slug: ShareSlugSchema,
    path: z.string(),
    bytes: ShareBytesSchema,
  })
  .strict();

function hasCanonicalSharePath(value: { id: string; slug: string; path: string }): boolean {
  return value.path === `/s/${value.slug}-${value.id}`;
}

export const CreateShareResponseSchema = ShareResourceSchema.extend({
  created: z.boolean(),
})
  .strict()
  .refine(hasCanonicalSharePath);

export const GetShareResponseSchema = ShareResourceSchema.extend({
  profile: ShareProfileSchema,
  views: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
})
  .strict()
  .refine(hasCanonicalSharePath);

export const PopularShareSchema = ShareResourceSchema.extend({
  views: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
})
  .strict()
  .refine(hasCanonicalSharePath);

export const PopularSharesResponseSchema = z
  .object({
    shares: z.array(PopularShareSchema),
  })
  .strict();

export type ShareId = z.infer<typeof ShareIdSchema>;
export type ShareName = z.infer<typeof ShareNameSchema>;
export type ShareProfileV2 = z.infer<typeof ShareProfileV2Schema>;
export type ShareProfileV3 = z.infer<typeof ShareProfileV3Schema>;
export type ShareProfile = z.infer<typeof ShareProfileSchema>;
export type ShareDocumentV2 = z.infer<typeof ShareDocumentV2Schema>;
export type ShareDocumentV3 = z.infer<typeof ShareDocumentV3Schema>;
export type CreateShareResponse = z.infer<typeof CreateShareResponseSchema>;
export type GetShareResponse = z.infer<typeof GetShareResponseSchema>;
export type PopularShare = z.infer<typeof PopularShareSchema>;
export type PopularSharesResponse = z.infer<typeof PopularSharesResponseSchema>;