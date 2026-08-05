import type {
  MatchFinalStats,
  MatchMetadata,
  MatchMetadataItem,
  PlayerMatchHistoryEntry,
  PlayerSteamProfile,
} from '@/lib/api/schema';

export type MatchHistoryOutcome = 'win' | 'loss' | 'unknown';

export type MatchHistoryTeamPlayer = {
  accountId: number;
  heroId: number | null;
  personaName: string;
  isCurrentPlayer: boolean;
};

export type MatchHistoryTeam = {
  id: string;
  players: MatchHistoryTeamPlayer[];
};

export type MatchHistoryRow = {
  matchId: number;
  startTime: number;
  durationSeconds: number;
  heroId: number | null;
  team: string | null;
  modeLabel: string;
  outcome: MatchHistoryOutcome;
  detailsAvailable: boolean;
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    kdaRatio: number;
    creepKills: number;
    creepKillsPerMinute: number;
    killParticipation: number;
    headshotRate: number;
    souls: number;
  };
  finalBuildItemIds: number[];
  teams: MatchHistoryTeam[];
};

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function numberOrFallback(value: number | null | undefined, fallback = 0): number {
  return numberOrNull(value) ?? fallback;
}

function parseMetadataTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed / 1000 : null;
}

function historyTeamLabel(team: number | null | undefined): string | null {
  const normalized = numberOrNull(team);
  return normalized === 0 || normalized === 1 ? `Team${normalized}` : null;
}

function getPersonaName(
  accountId: number,
  steamProfiles: Readonly<Record<string, PlayerSteamProfile>>,
): string {
  const personaName = steamProfiles[String(accountId)]?.personaname;
  return personaName ?? `Account ${accountId}`;
}

/**
 * Resolve the final inventory from the event stream returned by match metadata.
 * An item can occur several times while it is upgraded or repurchased; the
 * latest event for an item ID determines whether it remains in the final build.
 */
export function getFinalBuildItems(items: readonly MatchMetadataItem[]): number[] {
  const latestByItemId = new Map<number, MatchMetadataItem>();

  for (const item of items) {
    if (!Number.isInteger(item.item_id) || item.item_id <= 0) continue;

    const previous = latestByItemId.get(item.item_id);
    if (!previous || item.game_time_s >= previous.game_time_s) {
      latestByItemId.set(item.item_id, item);
    }
  }

  return [...latestByItemId.values()]
    .filter((item) => (item.flags & 1) === 0)
    .sort((a, b) => a.game_time_s - b.game_time_s)
    .map((item) => item.item_id);
}

function buildTeams(
  match: MatchMetadata | undefined,
  accountId: number,
  steamProfiles: Readonly<Record<string, PlayerSteamProfile>>,
): MatchHistoryTeam[] {
  if (!match) return [];

  const teams = new Map<string, MatchHistoryTeamPlayer[]>();
  for (const player of match.players) {
    if (!player.team || !Number.isInteger(player.account_id)) continue;

    const players = teams.get(player.team) ?? [];
    players.push({
      accountId: player.account_id,
      heroId: numberOrNull(player.hero_id),
      personaName: getPersonaName(player.account_id, steamProfiles),
      isCurrentPlayer: player.account_id === accountId,
    });
    teams.set(player.team, players);
  }

  return [...teams.entries()]
    .sort(([teamA], [teamB]) => teamA.localeCompare(teamB, undefined, { numeric: true }))
    .map(([id, players]) => ({ id, players }));
}

function resolveOutcome(
  match: PlayerMatchHistoryEntry,
  metadata: MatchMetadata | undefined,
  team: string | null,
): MatchHistoryOutcome {
  if (metadata?.winning_team && team) {
    return metadata.winning_team === team ? 'win' : 'loss';
  }

  const result = numberOrNull(match.match_result);
  const playerTeam = numberOrNull(match.player_team);
  if (result !== null && playerTeam !== null) {
    return result === playerTeam ? 'win' : 'loss';
  }

  return 'unknown';
}

const FALLBACK_GAME_MODE_LABELS: Record<number, string> = {
  1: 'Normal',
  4: 'StreetBrawl',
};

function resolveModeLabel(
  match: PlayerMatchHistoryEntry,
  metadata: MatchMetadata | undefined,
): string {
  const gameMode = metadata?.game_mode?.trim() || null;
  const matchMode = metadata?.match_mode?.trim() || null;

  if (matchMode?.toLowerCase() === 'ranked') return 'Ranked';

  const metadataLabel = [gameMode, matchMode]
    .filter((value): value is string => Boolean(value))
    .filter((value) => value.toLowerCase() !== 'unranked')
    .join(' · ');
  if (metadataLabel) return metadataLabel;

  const fallbackGameMode = numberOrNull(match.game_mode);
  return fallbackGameMode === null
    ? 'Match'
    : FALLBACK_GAME_MODE_LABELS[fallbackGameMode] ?? `Mode ${fallbackGameMode}`;
}
export type MatchHistoryMetricTone = 'neutral' | 'negative' | 'average' | 'positive' | 'amazing';

export function getKdaTone(kdaRatio: number): MatchHistoryMetricTone {
  if (!Number.isFinite(kdaRatio)) return 'neutral';
  if (kdaRatio < 1) return 'negative';
  if (kdaRatio <= 3) return 'positive';
  if (kdaRatio > 5) return 'amazing';
  return 'average';
}

export function getCreepScorePerMinuteTone(
  modeLabel: string,
  creepKillsPerMinute: number,
): MatchHistoryMetricTone {
  const normalizedMode = modeLabel.trim().toLowerCase();
  if (normalizedMode !== 'normal' && normalizedMode !== 'ranked') return 'neutral';
  if (!Number.isFinite(creepKillsPerMinute)) return 'neutral';
  if (creepKillsPerMinute < 2.5) return 'negative';
  if (creepKillsPerMinute >= 3.5) return 'positive';
  return 'average';
}

function buildPlayerStats(
  match: PlayerMatchHistoryEntry,
  player: MatchMetadata['players'][number] | undefined,
  durationSeconds: number,
  metadata: MatchMetadata | undefined,
): MatchHistoryRow['stats'] {
  const finalStats: MatchFinalStats | null = player?.final_stats ?? null;
  const kills = numberOrFallback(finalStats?.kills, numberOrFallback(match.player_kills));
  const deaths = numberOrFallback(finalStats?.deaths, numberOrFallback(match.player_deaths));
  const assists = numberOrFallback(finalStats?.assists, numberOrFallback(match.player_assists));
  const creepKills = numberOrFallback(finalStats?.creep_kills, numberOrFallback(match.last_hits));
  const souls = numberOrFallback(finalStats?.net_worth, numberOrFallback(match.net_worth));
  const bulletsHit = numberOrFallback(finalStats?.hero_bullets_hit);
  const criticalBullets = numberOrFallback(finalStats?.hero_bullets_hit_crit);
  const team = player?.team ?? null;
  const teamKills =
    metadata && team
      ? metadata.players
          .filter((teamPlayer) => teamPlayer.team === team)
          .reduce((total, teamPlayer) => total + numberOrFallback(teamPlayer.final_stats?.kills), 0)
      : 0;
  const matchMinutes = durationSeconds > 0 ? durationSeconds / 60 : 0;
  const kdaRatio = deaths === 0 ? kills + assists : (kills + assists) / deaths;

  return {
    kills,
    deaths,
    assists,
    kdaRatio,
    creepKills,
    creepKillsPerMinute: matchMinutes > 0 ? creepKills / matchMinutes : 0,
    killParticipation: teamKills > 0 ? Math.min(Math.max((kills + assists) / teamKills, 0), 1) : 0,
    headshotRate: bulletsHit > 0 ? Math.min(Math.max(criticalBullets / bulletsHit, 0), 1) : 0,
    souls,
  };
}

/**
 * Merge the lightweight history list with any enriched metadata pages already
 * fetched. Missing metadata never removes a match: the history fields remain a
 * usable fallback while the richer row shows its unavailable state.
 */
export function buildMatchHistoryRows(
  matches: readonly PlayerMatchHistoryEntry[],
  metadata: readonly MatchMetadata[],
  accountId: number,
  steamProfiles: Readonly<Record<string, PlayerSteamProfile>> = {},
): MatchHistoryRow[] {
  const metadataByMatchId = new Map(metadata.map((match) => [match.match_id, match]));

  return matches.map((match) => {
    const matchMetadata = metadataByMatchId.get(match.match_id);
    const player = matchMetadata?.players.find((candidate) => candidate.account_id === accountId);
    const durationSeconds = numberOrFallback(
      matchMetadata?.duration_s,
      numberOrFallback(match.match_duration_s),
    );
    const statsDuration = numberOrFallback(player?.final_stats?.time_stamp_s, durationSeconds);
    const effectiveDuration = durationSeconds > 0 ? durationSeconds : statsDuration;
    const heroId = numberOrNull(player?.hero_id) ?? numberOrNull(match.hero_id);
    const team = player?.team ?? historyTeamLabel(match.player_team);

    return {
      matchId: match.match_id,
      startTime:
        parseMetadataTimestamp(matchMetadata?.start_time) ?? numberOrFallback(match.start_time),
      durationSeconds: effectiveDuration,
      heroId,
      team,
      modeLabel: resolveModeLabel(match, matchMetadata),
      outcome: resolveOutcome(match, matchMetadata, team),
      detailsAvailable: Boolean(matchMetadata && player),
      stats: buildPlayerStats(match, player, effectiveDuration, matchMetadata),
      finalBuildItemIds: getFinalBuildItems(player?.items ?? []),
      teams: buildTeams(matchMetadata, accountId, steamProfiles),
    };
  });
}
