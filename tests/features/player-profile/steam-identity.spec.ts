import { describe, expect, it } from 'vitest';
import {
  deriveVacState,
  formatVacLabel,
  resolveDisplayName,
} from '@/features/player-profile/lib/steam-identity';

describe('deriveVacState', () => {
  it('returns "unknown" when profile is null', () => {
    expect(deriveVacState(null)).toBe('unknown');
  });

  it('returns "unknown" when vac_banned is null', () => {
    expect(deriveVacState({ vac_banned: null, game_ban_count: null })).toBe('unknown');
  });

  it('returns "banned" when vac_banned is true', () => {
    expect(deriveVacState({ vac_banned: true, game_ban_count: 0 })).toBe('banned');
  });

  it('returns "banned" when game_ban_count is greater than zero', () => {
    expect(deriveVacState({ vac_banned: false, game_ban_count: 1 })).toBe('banned');
    expect(deriveVacState({ vac_banned: false, game_ban_count: 3 })).toBe('banned');
  });

  it('returns "clean" when vac_banned is false and game_ban_count is zero', () => {
    expect(deriveVacState({ vac_banned: false, game_ban_count: 0 })).toBe('clean');
  });

  it('treats null game_ban_count as zero when vac_banned is false', () => {
    expect(deriveVacState({ vac_banned: false, game_ban_count: null })).toBe('clean');
  });
});

describe('formatVacLabel', () => {
  it('returns "VAC Unknown" for unknown state', () => {
    expect(formatVacLabel('unknown', null)).toBe('VAC Unknown');
  });

  it('returns "VAC Clean" for clean state', () => {
    expect(formatVacLabel('clean', { vac_ban_count: 0, game_ban_count: 0 })).toBe('VAC Clean');
  });

  it('formats VAC bans only', () => {
    expect(formatVacLabel('banned', { vac_ban_count: 1, game_ban_count: 0 })).toBe('Banned · 1 VAC');
  });

  it('formats game bans only', () => {
    expect(formatVacLabel('banned', { vac_ban_count: 0, game_ban_count: 2 })).toBe('Banned · 2 Game');
  });

  it('formats both VAC and game bans', () => {
    expect(formatVacLabel('banned', { vac_ban_count: 1, game_ban_count: 2 })).toBe(
      'Banned · 1 VAC · 2 Game',
    );
  });

  it('falls back to "Banned" when counts are absent', () => {
    expect(formatVacLabel('banned', null)).toBe('Banned');
    expect(formatVacLabel('banned', { vac_ban_count: null, game_ban_count: null })).toBe('Banned');
  });
});

describe('resolveDisplayName', () => {
  it('returns the persona name when present', () => {
    expect(resolveDisplayName({ persona_name: 'Re:ZERO Season 4™' }, 342189169)).toBe(
      'Re:ZERO Season 4™',
    );
  });

  it('trims whitespace from persona name', () => {
    expect(resolveDisplayName({ persona_name: '  Player Name  ' }, 123)).toBe('Player Name');
  });

  it('falls back to account id when persona name is empty', () => {
    expect(resolveDisplayName({ persona_name: '' }, 342189169)).toBe('Account 342189169');
    expect(resolveDisplayName({ persona_name: '   ' }, 342189169)).toBe('Account 342189169');
  });

  it('falls back to account id when profile is null', () => {
    expect(resolveDisplayName(null, 342189169)).toBe('Account 342189169');
  });
});
