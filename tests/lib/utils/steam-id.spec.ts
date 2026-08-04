import { describe, expect, it } from 'vitest';
import { steamProfileUrl, toSteam64 } from '@/lib/utils/steam-id';

describe('toSteam64', () => {
  it('converts a steam32 account id to its steam64 string', () => {
    expect(toSteam64(342189169)).toBe('76561198302454897');
  });

  it('preserves precision beyond Number.MAX_SAFE_INTEGER', () => {
    const steam64 = toSteam64(342189169)!;

    // The naive Number path silently corrupts the final digits; the string must not.
    expect(Number(steam64)).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    expect(steam64).toBe('76561198302454897');
    expect(steam64.endsWith('897')).toBe(true);
  });

  it('maps the lowest valid account id', () => {
    expect(toSteam64(1)).toBe('76561197960265729');
  });

  it('returns null for non-positive or fractional input', () => {
    expect(toSteam64(0)).toBeNull();
    expect(toSteam64(-5)).toBeNull();
    expect(toSteam64(1.5)).toBeNull();
    expect(toSteam64(Number.NaN)).toBeNull();
  });
});

describe('steamProfileUrl', () => {
  it('builds the canonical community URL', () => {
    expect(steamProfileUrl('76561198302454897')).toBe(
      'https://steamcommunity.com/profiles/76561198302454897/',
    );
  });
});
