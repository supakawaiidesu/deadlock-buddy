import { describe, expect, it } from 'vitest';
import type {
  MatchMetadata,
  PlayerMatchHistoryEntry,
} from '@/lib/api/schema';
import {
  buildMatchHistoryRows,
  getCreepScorePerMinuteTone,
  getFinalBuildItems,
  getKdaTone,
} from '@/features/player-profile/lib/match-history';

function history(overrides: Partial<PlayerMatchHistoryEntry> = {}): PlayerMatchHistoryEntry {
  return {
    account_id: 42,
    match_id: 100,
    hero_id: 7,
    hero_level: 30,
    start_time: 1_700_000_000,
    game_mode: 1,
    match_mode: 1,
    player_kills: 2,
    player_deaths: 3,
    player_assists: 4,
    last_hits: 50,
    net_worth: 20_000,
    match_duration_s: 600,
    match_result: 0,
    player_team: 0,
    ...overrides,
  } as PlayerMatchHistoryEntry;
}

const enrichedMatch = {
  match_id: 100,
  start_time: '2026-08-01 12:00:00',
  winning_team: 'Team0',
  duration_s: 1200,
  match_outcome: 'TeamWin',
  match_mode: 'Ranked',
  game_mode: 'Normal',
  players: [
    {
      account_id: 42,
      hero_id: 7,
      team: 'Team0',
      player_slot: 0,
      items: [
        { flags: 0, game_time_s: 10, item_id: 10 },
        { flags: 1, game_time_s: 20, item_id: 10 },
        { flags: 1, game_time_s: 5, item_id: 11 },
        { flags: 0, game_time_s: 25, item_id: 11 },
        { flags: 0, game_time_s: 30, item_id: 12 },
      ],
      final_stats: {
        assists: 3,
        deaths: 2,
        kills: 5,
        creep_kills: 100,
        hero_bullets_hit: 100,
        hero_bullets_hit_crit: 25,
        net_worth: 40_000,
        time_stamp_s: 1200,
      },
    },
    {
      account_id: 43,
      hero_id: 8,
      team: 'Team0',
      player_slot: 1,
      items: [],
      final_stats: {
        assists: 1,
        deaths: 1,
        kills: 3,
        creep_kills: 40,
        hero_bullets_hit: 10,
        hero_bullets_hit_crit: 0,
        net_worth: 10_000,
        time_stamp_s: 1200,
      },
    },
    {
      account_id: 44,
      hero_id: 9,
      team: 'Team1',
      player_slot: 2,
      items: [],
      final_stats: null,
    },
  ],
  banned_hero_ids: [],
} as MatchMetadata;

describe('match history transforms', () => {
  it('keeps the latest unsold item event for each item ID', () => {
    expect(getFinalBuildItems(enrichedMatch.players[0].items)).toEqual([11, 12]);
  });

  it('merges enriched stats, roster names, and derived performance metrics', () => {
    const [row] = buildMatchHistoryRows(
      [history()],
      [enrichedMatch],
      42,
      {
        '42': { account_id: 42, personaname: 'Current Player' },
        '43': { account_id: 43, personaname: 'Teammate' },
        '44': { account_id: 44, personaname: 'Opponent' },
      },
    );

    expect(row).toMatchObject({
      matchId: 100,
      heroId: 7,
      team: 'Team0',
      modeLabel: 'Ranked',
      outcome: 'win',
      durationSeconds: 1200,
      detailsAvailable: true,
      finalBuildItemIds: [11, 12],
    });
    expect(row.stats).toMatchObject({
      kills: 5,
      deaths: 2,
      assists: 3,
      kdaRatio: 4,
      creepKills: 100,
      creepKillsPerMinute: 5,
      killParticipation: 1,
      headshotRate: 0.25,
      souls: 40_000,
    });
    expect(row.teams).toEqual([
      {
        id: 'Team0',
        players: [
          { accountId: 42, heroId: 7, personaName: 'Current Player', isCurrentPlayer: true },
          { accountId: 43, heroId: 8, personaName: 'Teammate', isCurrentPlayer: false },
        ],
      },
      {
        id: 'Team1',
        players: [{ accountId: 44, heroId: 9, personaName: 'Opponent', isCurrentPlayer: false }],
      },
    ]);
  });
  it('uses concise labels for ranked and unranked matches', () => {
    const normalMatch = {
      ...enrichedMatch,
      game_mode: 'Normal',
      match_mode: 'Unranked',
    } as MatchMetadata;
    const streetBrawlMatch = {
      ...enrichedMatch,
      game_mode: 'StreetBrawl',
      match_id: 101,
      match_mode: 'Unranked',
    } as MatchMetadata;

    expect(buildMatchHistoryRows([history()], [normalMatch], 42)[0].modeLabel).toBe('Normal');
    expect(
      buildMatchHistoryRows(
        [history({ match_id: 101, game_mode: 4 })],
        [streetBrawlMatch],
        42,
      )[0].modeLabel,
    ).toBe('StreetBrawl');
  });
  it('classifies KDA and creep score performance by mode', () => {
    expect(getKdaTone(0.99)).toBe('negative');
    expect(getKdaTone(1)).toBe('positive');
    expect(getKdaTone(3)).toBe('positive');
    expect(getKdaTone(3.01)).toBe('average');
    expect(getKdaTone(5)).toBe('average');
    expect(getKdaTone(5.01)).toBe('amazing');

    expect(getCreepScorePerMinuteTone('Normal', 2.49)).toBe('negative');
    expect(getCreepScorePerMinuteTone('Normal', 2.5)).toBe('average');
    expect(getCreepScorePerMinuteTone('Normal', 3.1)).toBe('average');
    expect(getCreepScorePerMinuteTone('Ranked', 3.5)).toBe('positive');
    expect(getCreepScorePerMinuteTone('StreetBrawl', 1)).toBe('neutral');
  });



  it('falls back to lightweight history when enriched metadata is missing', () => {
    const [row] = buildMatchHistoryRows(
      [
        history({
          match_result: 1,
          player_team: 0,
          player_kills: 7,
          player_deaths: 0,
          player_assists: 2,
          last_hits: 80,
          net_worth: 25_000,
        }),
      ],
      [],
      42,
    );

    expect(row).toMatchObject({
      outcome: 'loss',
      heroId: 7,
      modeLabel: 'Normal',
      durationSeconds: 600,
      detailsAvailable: false,
      finalBuildItemIds: [],
      teams: [],
    });
    expect(row.stats).toMatchObject({
      kills: 7,
      deaths: 0,
      assists: 2,
      kdaRatio: 9,
      creepKills: 80,
      creepKillsPerMinute: 8,
      souls: 25_000,
    });
  });

  it('does not mutate history or metadata inputs', () => {
    const matches = [history({ match_id: 101 }), history({ match_id: 100 })];
    const metadata = [enrichedMatch];
    const matchIdsBefore = matches.map((match) => match.match_id);
    const metadataPlayersBefore = [...metadata[0].players];

    buildMatchHistoryRows(matches, metadata, 42);

    expect(matches.map((match) => match.match_id)).toEqual(matchIdsBefore);
    expect(metadata[0].players).toEqual(metadataPlayersBefore);
  });
});
