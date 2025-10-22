import itemsRaw from '@/lib/data/items.json';

type ItemRecord = {
  id: number;
  name?: string;
  class_name?: string;
  image?: string;
  image_webp?: string;
};

export type ItemSummary = {
  id: number;
  name: string;
  slug: string | null;
  icon: {
    png?: string;
    webp?: string;
  };
};

const ITEM_MAP: Map<number, ItemSummary> = new Map();

(itemsRaw as ItemRecord[]).forEach((item) => {
  if (!item || typeof item.id !== 'number') {
    return;
  }

  const name =
    typeof item.name === 'string' && item.name.trim().length > 0
      ? item.name
      : typeof item.class_name === 'string'
        ? item.class_name
        : `Item #${item.id}`;

  ITEM_MAP.set(item.id, {
    id: item.id,
    name,
    slug: typeof item.class_name === 'string' ? item.class_name : null,
    icon: {
      png: typeof item.image === 'string' && item.image.trim().length > 0 ? item.image : undefined,
      webp:
        typeof item.image_webp === 'string' && item.image_webp.trim().length > 0
          ? item.image_webp
          : undefined,
    },
  });
});

export function getItemSummary(itemId: number): ItemSummary | undefined {
  return ITEM_MAP.get(itemId);
}

export function getItemDisplayName(itemId: number): string {
  const item = ITEM_MAP.get(itemId);
  return item?.name ?? `Item #${itemId}`;
}

export function getItemIconUrl(
  itemId: number,
  options: { prefer?: 'webp' | 'png' } = {},
): string | null {
  const item = ITEM_MAP.get(itemId);
  if (!item) return null;

  const prefer = options.prefer ?? 'webp';
  if (prefer === 'png') {
    return item.icon.png ?? item.icon.webp ?? null;
  }

  return item.icon.webp ?? item.icon.png ?? null;
}

export const itemSummaries = Array.from(ITEM_MAP.values());
