export type HeroTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

const HERO_TIER_THRESHOLDS: { tier: HeroTier; min: number }[] = [
  { tier: 'S', min: 0.53 },
  { tier: 'A', min: 0.52 },
  { tier: 'B', min: 0.5 },
  { tier: 'C', min: 0.48 },
  { tier: 'D', min: 0.46 },
  { tier: 'F', min: 0 },
];

export function resolveHeroTier(winrate?: number): HeroTier | null {
  if (typeof winrate !== 'number' || Number.isNaN(winrate)) {
    return null;
  }

  const match = HERO_TIER_THRESHOLDS.find((entry) => winrate >= entry.min);
  return match?.tier ?? null;
}

export function getHeroTierThresholds(): ReadonlyArray<{ tier: HeroTier; min: number }> {
  return HERO_TIER_THRESHOLDS;
}
