import heroesRaw from '@/lib/data/heros.json';

type HeroImages = {
  icon_image_small?: string;
  icon_image_small_webp?: string;
};

type HeroRecord = {
  id: number;
  name: string;
  images?: HeroImages;
};

export type HeroSummary = {
  id: number;
  name: string;
  icon: {
    png?: string;
    webp?: string;
  };
};

const HERO_MAP: Map<number, HeroSummary> = new Map();

(heroesRaw as HeroRecord[]).forEach((hero) => {
  if (!hero || typeof hero.id !== 'number' || typeof hero.name !== 'string') {
    return;
  }

  const images = hero.images ?? {};

  const summary: HeroSummary = {
    id: hero.id,
    name: hero.name,
    icon: {
      png: images.icon_image_small,
      webp: images.icon_image_small_webp,
    },
  };

  HERO_MAP.set(hero.id, summary);
});

export function getHeroDisplayName(heroId: number): string {
  const hero = HERO_MAP.get(heroId);
  return hero?.name ?? `Hero #${heroId}`;
}

export function getHeroIconUrl(
  heroId: number,
  options: { prefer?: 'webp' | 'png' } = {},
): string | null {
  const hero = HERO_MAP.get(heroId);
  if (!hero) return null;

  const prefer = options.prefer ?? 'webp';
  if (prefer === 'png') {
    return hero.icon.png ?? hero.icon.webp ?? null;
  }

  return hero.icon.webp ?? hero.icon.png ?? null;
}

export const heroSummaries = Array.from(HERO_MAP.values());
