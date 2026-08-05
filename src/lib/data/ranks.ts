/**
 * Deadlock rank ladder.
 *
 * Badge levels encode tier and sub-rank in one number: `tier * 10 + subrank`,
 * so Oracle 6 is badge 86. The tier ranges below are expressed in badge space
 * (Initiate spans 11-16) because that is what both the distribution histogram
 * and the per-player rank endpoint return.
 */
export type RankBadgeInput = {
  badge?: number | null;
  rank?: number | null;
  subrank?: number | null;
};

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
export const OBSCURUS_TIER = 'Obscurus';

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
  [OBSCURUS_TIER]: 'rgb(var(--text-rgb)/0.45)',
  [UNCLASSIFIED_TIER]: 'var(--accent)',
};

const RANK_ASSET_BASE_URL =
  'https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks';
const MAX_RANK_TIER = RANK_TIERS.length;
const MAX_SUBRANK = 6;

/** Tier plus sub-rank for a badge level, e.g. `86` -> `Oracle 6`. */
export function buildTierLabel(badge: number): { tierName: string; label: string } {
  if (badge === 0) {
    return { tierName: OBSCURUS_TIER, label: OBSCURUS_TIER };
  }

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
 * `0` for accounts that have never been ranked, which is the `Obscurus` tier.
 * `badge` is preferred when present because it survives the tier/sub-rank pair being omitted.
 */
export function resolveRankBadge(
  input: RankBadgeInput | null | undefined,
): RankBadgeParts {
  if (!input) {
    return {
      tierName: UNCLASSIFIED_TIER,
      subRank: null,
      label: 'Unranked',
      color: 'rgb(var(--text-rgb)/0.45)',
    };
  }

  const badge = input.badge ?? 0;
  const tierIndex = input.rank ?? 0;
  const subrank = input.subrank ?? 0;

  if (badge > 0) {
    const { tierName, label } = buildTierLabel(badge);
    return {
      tierName,
      subRank: subrank > 0 ? subrank : null,
      label,
      color: TIER_COLORS[tierName] ?? TIER_COLORS[UNCLASSIFIED_TIER],
    };
  }
  if (badge === 0 && tierIndex === 0) {
    return {
      tierName: OBSCURUS_TIER,
      subRank: null,
      label: OBSCURUS_TIER,
      color: TIER_COLORS[OBSCURUS_TIER],
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

function isPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

type RankAssetPosition = {
  tier: number;
  subrank: number | null;
};

function resolveRankAssetPosition(
  input: RankBadgeInput | null | undefined,
): RankAssetPosition | null {
  if (!input) return null;

  const badge = input.badge;
  if (typeof badge === 'number' && Number.isInteger(badge) && badge > 0) {
    const tier = Math.floor(badge / 10);
    if (tier < 1 || tier > MAX_RANK_TIER) return null;

    const badgeSubrank = badge % 10;
    const explicitSubrank =
      isPositiveInteger(input.subrank) && input.subrank <= MAX_SUBRANK
        ? input.subrank
        : null;
    const subrank = explicitSubrank ?? badgeSubrank;

    if (subrank < 1 || subrank > MAX_SUBRANK) return null;
    return { tier, subrank };
  }

  const tier = isPositiveInteger(input.rank) ? input.rank : 0;
  if (tier === 0) return { tier: 0, subrank: null };
  if (tier > MAX_RANK_TIER) return null;

  const subrank =
    isPositiveInteger(input.subrank) && input.subrank <= MAX_SUBRANK
      ? input.subrank
      : null;
  return { tier, subrank };
}

/**
 * Resolve an immutable CDN badge URL without fetching the rank asset catalog.
 * WebP is preferred because the rank endpoint's small WebP badges are about
 * 8 KB, while the corresponding large badges are roughly 144 KB.
 */
export function getRankBadgeImageUrl(
  input: RankBadgeInput | null | undefined,
  options: { size?: 'small' | 'large'; prefer?: 'webp' | 'png' } = {},
): string | null {
  const position = resolveRankAssetPosition(input);
  if (!position) return null;

  const size = options.size ?? 'small';
  const extension = (options.prefer ?? 'webp') === 'webp' ? 'webp' : 'png';

  if (position.tier === 0) {
    return size === 'large'
      ? `${RANK_ASSET_BASE_URL}/rank00_lg.${extension}`
      : `${RANK_ASSET_BASE_URL}/rank0/badge_sm.${extension}`;
  }

  if (position.subrank !== null) {
    const badgeSize = size === 'large' ? 'lg' : 'sm';
    return `${RANK_ASSET_BASE_URL}/rank${position.tier}/badge_${badgeSize}_subrank${position.subrank}.${extension}`;
  }

  // The API has no generic small badge for ranked tiers; use the tier badge
  // rather than inventing a sub-rank when the endpoint omits one.
  const paddedTier = String(position.tier).padStart(2, '0');
  return `${RANK_ASSET_BASE_URL}/rank${paddedTier}_lg.${extension}`;
}
