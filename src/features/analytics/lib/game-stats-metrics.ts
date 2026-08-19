import type { GameStatsMetric } from '@/features/analytics/lib/game-stats-timeseries';
import { formatCompactNumber, formatMinutes, formatNumber, formatPercent } from '@/lib/utils/format';

export const GAME_STATS_METRIC_LIMIT = 8;

type GameStatsMetricFormat = 'decimal' | 'duration' | 'integer' | 'percent';

export type GameStatsMetricDefinition = {
  label: string;
  format: GameStatsMetricFormat;
};

export const GAME_STATS_METRIC_DEFINITIONS: Record<GameStatsMetric, GameStatsMetricDefinition> = {
  total_matches: { label: 'Total matches', format: 'integer' },
  total_players: { label: 'Total players', format: 'integer' },
  team0_wins: { label: 'Team 0 wins', format: 'integer' },
  team1_wins: { label: 'Team 1 wins', format: 'integer' },
  avg_duration_s: { label: 'Average duration', format: 'duration' },
  avg_kills: { label: 'Average kills', format: 'decimal' },
  avg_deaths: { label: 'Average deaths', format: 'decimal' },
  avg_assists: { label: 'Average assists', format: 'decimal' },
  avg_kd_ratio: { label: 'Average K/D ratio', format: 'decimal' },
  avg_net_worth: { label: 'Average net worth', format: 'decimal' },
  avg_last_hits: { label: 'Average last hits', format: 'decimal' },
  avg_denies: { label: 'Average denies', format: 'decimal' },
  avg_player_damage: { label: 'Average player damage', format: 'decimal' },
  avg_player_damage_taken: { label: 'Average damage taken', format: 'decimal' },
  avg_boss_damage: { label: 'Average boss damage', format: 'decimal' },
  avg_player_healing: { label: 'Average player healing', format: 'decimal' },
  avg_accuracy: { label: 'Average accuracy', format: 'percent' },
  avg_crit_rate: { label: 'Average crit rate', format: 'percent' },
  avg_ending_level: { label: 'Average ending level', format: 'decimal' },
  avg_gold_player: { label: 'Average player gold', format: 'decimal' },
  avg_gold_player_orbs: { label: 'Average player-orb gold', format: 'decimal' },
  avg_gold_lane_creep: { label: 'Average lane-creep gold', format: 'decimal' },
  avg_gold_lane_creep_orbs: { label: 'Average lane-creep-orb gold', format: 'decimal' },
  avg_gold_neutral_creep: { label: 'Average neutral-creep gold', format: 'decimal' },
  avg_gold_neutral_creep_orbs: { label: 'Average neutral-creep-orb gold', format: 'decimal' },
  avg_gold_boss: { label: 'Average boss gold', format: 'decimal' },
  avg_gold_boss_orb: { label: 'Average boss-orb gold', format: 'decimal' },
  avg_gold_treasure: { label: 'Average treasure gold', format: 'decimal' },
  avg_gold_denied: { label: 'Average denied gold', format: 'decimal' },
  avg_gold_death_loss: { label: 'Average death-loss gold', format: 'decimal' },
  avg_creep_damage: { label: 'Average creep damage', format: 'decimal' },
  avg_neutral_damage: { label: 'Average neutral damage', format: 'decimal' },
  avg_self_healing: { label: 'Average self healing', format: 'decimal' },
  avg_damage_mitigated: { label: 'Average damage mitigated', format: 'decimal' },
  avg_damage_absorbed: { label: 'Average damage absorbed', format: 'decimal' },
  avg_heal_prevented: { label: 'Average healing prevented', format: 'decimal' },
  avg_creep_kills: { label: 'Average creep kills', format: 'decimal' },
  avg_neutral_kills: { label: 'Average neutral kills', format: 'decimal' },
  avg_possible_creeps: { label: 'Average possible creeps', format: 'decimal' },
  avg_max_health: { label: 'Average max health', format: 'decimal' },
  avg_weapon_power: { label: 'Average weapon power', format: 'decimal' },
  avg_tech_power: { label: 'Average spirit power', format: 'decimal' },
  avg_first_mid_boss_time_s: { label: 'Average first Mid Boss time', format: 'duration' },
  avg_first_objective_destroyed_time_s: { label: 'Average first objective time', format: 'duration' },
  mid_boss_kill_rate: { label: 'Mid Boss kill rate', format: 'percent' },
  abandon_rate: { label: 'Abandon rate', format: 'percent' },
};

export const GAME_STATS_METRICS = Object.entries(GAME_STATS_METRIC_DEFINITIONS).map(
  ([id, definition]) => ({ id: id as GameStatsMetric, ...definition }),
);

const gameStatsMetricIds = new Set<GameStatsMetric>(
  GAME_STATS_METRICS.map(({ id }) => id),
);

export function isGameStatsMetric(value: unknown): value is GameStatsMetric {
  return typeof value === 'string' && gameStatsMetricIds.has(value as GameStatsMetric);
}

export function gameStatsSeriesColor(index: number): string {
  return `var(--chart-series-${index % GAME_STATS_METRIC_LIMIT + 1})`;
}

export function gameStatsMetricMinMove(metric: GameStatsMetric): number {
  switch (GAME_STATS_METRIC_DEFINITIONS[metric].format) {
    case 'integer':
      return 1;
    case 'percent':
      return 0.001;
    default:
      return 0.1;
  }
}

export function formatGameStatsAxisValue(metric: GameStatsMetric, value: number): string {
  switch (GAME_STATS_METRIC_DEFINITIONS[metric].format) {
    case 'duration':
      return formatMinutes(value);
    case 'percent':
      return formatPercent(value);
    default:
      return formatCompactNumber(value);
  }
}

export function formatGameStatsTooltipValue(metric: GameStatsMetric, value: number): string {
  switch (GAME_STATS_METRIC_DEFINITIONS[metric].format) {
    case 'duration':
      return formatMinutes(value);
    case 'percent':
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}
