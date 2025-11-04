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
  slug: string;
  icon: {
    png?: string;
    webp?: string;
  };
};

const HERO_MAP: Map<number, HeroSummary> = new Map();
const HERO_SLUG_MAP: Map<string, HeroSummary> = new Map();

function slugify(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withHyphen = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-');

  const normalized = withHyphen
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : null;
}

(heroesRaw as HeroRecord[]).forEach((hero) => {
  if (!hero || typeof hero.id !== 'number' || typeof hero.name !== 'string') {
    return;
  }

  const primarySlug = slugify(hero.name) ?? hero.id.toString();
  const classNameSlug = slugify(hero.class_name);
  const rawClassSlug =
    typeof hero.class_name === 'string' ? hero.class_name.trim().toLowerCase() : null;
  const altSlug =
    classNameSlug && classNameSlug.startsWith('hero-')
      ? classNameSlug.slice(5)
      : classNameSlug ?? null;
  const images = hero.images ?? {};

  const summary: HeroSummary = {
    id: hero.id,
    name: hero.name,
    slug: primarySlug,
    icon: {
      png: images.icon_image_small,
      webp: images.icon_image_small_webp,
    },
  };

  HERO_MAP.set(hero.id, summary);
  HERO_SLUG_MAP.set(primarySlug, summary);
  if (classNameSlug) {
    HERO_SLUG_MAP.set(classNameSlug, summary);
  }
  if (altSlug) {
    HERO_SLUG_MAP.set(altSlug, summary);
  }
  if (rawClassSlug) {
    HERO_SLUG_MAP.set(rawClassSlug, summary);
  }
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

export function getHeroSummaryBySlug(slug: string): HeroSummary | undefined {
  const normalized = slug.toLowerCase();
  return HERO_SLUG_MAP.get(normalized);
}
