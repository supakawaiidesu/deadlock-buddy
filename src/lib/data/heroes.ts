import heroesRaw from '@/lib/data/heros.json';

type HeroImages = {
  icon_image_small?: string;
  icon_image_small_webp?: string;
};

type HeroRecord = {
  id: number;
  name: string;
  class_name?: string;
  images?: HeroImages;
};

export type HeroSummary = {
  id: number;
  name: string;
  slug: string | null;
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

  const slug = typeof hero.class_name === 'string' ? hero.class_name : null;
  const images = hero.images ?? {};

  HERO_MAP.set(hero.id, {
    id: hero.id,
    name: hero.name,
    slug,
    icon: {
      png: images.icon_image_small,
      webp: images.icon_image_small_webp,
    },
  });
});

export function getHeroSummary(heroId: number): HeroSummary | undefined {
  return HERO_MAP.get(heroId);
}

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

