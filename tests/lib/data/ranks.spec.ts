import { describe, expect, it } from 'vitest';
import { buildTierLabel, resolveRankBadge } from '@/lib/data/ranks';

describe('buildTierLabel', () => {
  it('maps a badge level to its tier and sub-rank', () => {
    expect(buildTierLabel(86)).toEqual({ tierName: 'Oracle', label: 'Oracle 6' });
    expect(buildTierLabel(11)).toEqual({ tierName: 'Initiate', label: 'Initiate 1' });
    expect(buildTierLabel(116)).toEqual({ tierName: 'Eternus', label: 'Eternus 6' });
  });

  it('falls back to a raw rank label for badges outside every tier', () => {
    expect(buildTierLabel(7)).toEqual({ tierName: 'Unclassified', label: 'Rank 7' });
    expect(buildTierLabel(120)).toEqual({ tierName: 'Unclassified', label: 'Rank 120' });
  });
});

describe('resolveRankBadge', () => {
  it('prefers the badge level when present', () => {
    const result = resolveRankBadge({ badge: 86, rank: 8, subrank: 6 });

    expect(result.label).toBe('Oracle 6');
    expect(result.tierName).toBe('Oracle');
    expect(result.subRank).toBe(6);
  });

  it('reports unranked accounts, which report every field as zero', () => {
    const result = resolveRankBadge({ badge: 0, rank: 0, subrank: 0 });

    expect(result.label).toBe('Unranked');
    expect(result.tierName).toBe('Unclassified');
    expect(result.subRank).toBeNull();
  });

  it('falls back to the tier index when the badge is missing', () => {
    const result = resolveRankBadge({ badge: 0, rank: 8, subrank: 3 });

    expect(result.label).toBe('Oracle 3');
    expect(result.tierName).toBe('Oracle');
  });

  it('treats null and undefined input as unranked', () => {
    expect(resolveRankBadge(null).label).toBe('Unranked');
    expect(resolveRankBadge(undefined).label).toBe('Unranked');
    expect(resolveRankBadge({}).label).toBe('Unranked');
  });
});
