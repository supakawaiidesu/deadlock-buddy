/**
 * Deadlock rank ladder.
 *
 * Badge levels encode tier and sub-rank in one number: `tier * 10 + subrank`,
 * so Oracle 6 is badge 86. The tier ranges below are expressed in badge space
 * (Initiate spans 11-16) because that is what both the distribution histogram
 * and the per-player rank endpoint return.
 */
export type RankTier = {
  name: string;
  start: number;
  end: number;
};

export const RANK_TIERS: readonly RankTier[] = [
  { name: 'Initiate', start: 11, end: 16 },
  { name: 'Seeker', start: 21, end: 26 },
  { name: 'Alchemist', start: 31, end: 36 },
  { name: 'Arcanist', start: 41, end: 46 },
  { name: 'Ritualist', start: 51, end: 56 },
  { name: 'Emissary', start: 61, end: 66 },
  { name: 'Archon', start: 71, end: 76 },
  { name: 'Oracle', start: 81, end: 86 },
  { name: 'Phantom', start: 91, end: 96 },
  { name: 'Ascendant', start: 101, end: 106 },
  { name: 'Eternus', start: 111, end: 116 },
];

export const UNCLASSIFIED_TIER = 'Unclassified';

export const TIER_COLORS: Record<string, string> = {
  Initiate: 'rgb(106, 62, 30)',
  Seeker: 'rgb(136, 35, 85)',
  Alchemist: 'rgb(92, 109, 171)',
  Arcanist: 'rgb(113, 156, 71)',
  Ritualist: 'rgb(221, 163, 38)',
  Emissary: 'rgb(238, 79, 87)',
  Archon: 'rgb(180, 127, 235)',
  Oracle: 'rgb(149, 81, 56)',
  Phantom: 'rgb(124, 124, 124)',
  Ascendant: 'rgb(195, 151, 81)',
  Eternus: 'rgb(85, 216, 157)',
  [UNCLASSIFIED_TIER]: 'var(--accent)',
};

/** Tier plus sub-rank for a badge level, e.g. `86` -> `Oracle 6`. */
export function buildTierLabel(badge: number): { tierName: string; label: string } {
  const tier = RANK_TIERS.find((entry) => badge >= entry.start && badge <= entry.end);
  if (!tier) {
    return { tierName: UNCLASSIFIED_TIER, label: `Rank ${badge}` };
  }

  const subRank = badge - tier.start + 1;

  return {
    tierName: tier.name,
    label: subRank > 0 ? `${tier.name} ${subRank}` : tier.name,
  };
}

export type RankBadgeParts = {
  /** Tier name on its own, e.g. `Oracle`. */
  tierName: string;
  /** Sub-rank within the tier, 1-6, or `null` when unranked/unknown. */
  subRank: number | null;
  /** Combined display label, e.g. `Oracle 6`. */
  label: string;
  color: string;
};

/**
 * Resolve the rank endpoint's `{ badge, rank, subrank }` triple into display parts.
 *
 * `rank` is the 1-based tier index and `subrank` the position inside it; both are
 * `0` for accounts that have never been ranked. `badge` is preferred when present
 * because it survives the tier/sub-rank pair being omitted.
 */
export function resolveRankBadge(
  input: { badge?: number | null; rank?: number | null; subrank?: number | null } | null | undefined,
): RankBadgeParts {
  const badge = input?.badge ?? 0;
  const tierIndex = input?.rank ?? 0;
  const subrank = input?.subrank ?? 0;

  if (badge > 0) {
    const { tierName, label } = buildTierLabel(badge);
    return {
      tierName,
      subRank: subrank > 0 ? subrank : null,
      label,
      color: TIER_COLORS[tierName] ?? TIER_COLORS[UNCLASSIFIED_TIER],
    };
  }

  // No badge but a tier index still identifies the tier (rank 8 -> Oracle).
  const tier = tierIndex > 0 ? RANK_TIERS[tierIndex - 1] : undefined;
  if (tier) {
    return {
      tierName: tier.name,
      subRank: subrank > 0 ? subrank : null,
      label: subrank > 0 ? `${tier.name} ${subrank}` : tier.name,
      color: TIER_COLORS[tier.name] ?? TIER_COLORS[UNCLASSIFIED_TIER],
    };
  }

  return {
    tierName: UNCLASSIFIED_TIER,
    subRank: null,
    label: 'Unranked',
    color: 'rgb(var(--text-rgb)/0.45)',
  };
}
