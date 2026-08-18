import { clampRect, compactVertical } from '@/features/widgets/widget-engine';
import type { WidgetDefinition, WidgetInstance } from '@/features/widgets/widget-types';
type StoredWidgetLayoutResolution<TInstance> = {
  widgets: TInstance[];
  migrated: boolean;
};

function mapWidgetGeometry(
  raw: unknown,
  transform: (x: number, w: number) => { x: number; w: number },
): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.x !== 'number' ||
      !Number.isFinite(candidate.x) ||
      typeof candidate.w !== 'number' ||
      !Number.isFinite(candidate.w)
    ) {
      return { ...candidate };
    }
    return { ...candidate, ...transform(candidate.x, candidate.w) };
  });
}

export function migrateThreeColumnWidgetLayout(raw: unknown): unknown {
  return mapWidgetGeometry(raw, (x, w) => ({ x: x * 4, w: w * 4 }));
}

export function quantizeTwelveColumnWidgetLayoutForShare(raw: unknown): unknown {
  return mapWidgetGeometry(raw, (x, w) => {
    const left = Math.floor(x / 4);
    const right = Math.ceil((x + w) / 4);
    const quantizedX = Math.max(0, Math.min(2, left));
    return {
      x: quantizedX,
      w: Math.max(1, Math.min(3 - quantizedX, right - quantizedX)),
    };
  });
}

export function createWidgetInstanceId(type: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${type}-${crypto.randomUUID()}`;
  }
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeWidgetLayout<
  TType extends string,
  TInstance extends WidgetInstance<TType> = WidgetInstance<TType>,
>(
  raw: unknown,
  registry: Readonly<Record<string, WidgetDefinition<TType, unknown, TInstance>>>,
): TInstance[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];

  const cleaned: TInstance[] = [];
  const seenIds = new Set<string>();

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue;

    const { id, type } = item as Partial<WidgetInstance<TType>>;
    if (typeof id !== 'string' || typeof type !== 'string') continue;
    if (!(type in registry) || seenIds.has(id)) continue;

    const definition = registry[type];
    if (!definition) continue;
    const candidate = item as Partial<WidgetInstance<TType>>;
    const hasCoordinates = [candidate.x, candidate.y, candidate.w, candidate.h].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    );
    const rect = hasCoordinates
      ? clampRect({
          x: candidate.x as number,
          y: candidate.y as number,
          w: candidate.w as number,
          h: candidate.h as number,
        })
      : clampRect({
          x: 0,
          y: index * 1000,
          w: definition.defaultW,
          h: definition.defaultH,
        });

    seenIds.add(id);
    cleaned.push(definition.sanitizeInstance(item, rect));
  }

  if (cleaned.length === 0) return null;
  return compactVertical(cleaned);
}

export function resolveStoredWidgetLayout<
  TType extends string,
  TInstance extends WidgetInstance<TType> = WidgetInstance<TType>,
>({
  current,
  legacy,
  defaultLayout,
  registry,
}: {
  current: unknown | undefined;
  legacy: unknown | undefined;
  defaultLayout: readonly TInstance[];
  registry: Readonly<Record<string, WidgetDefinition<TType, unknown, TInstance>>>;
}): StoredWidgetLayoutResolution<TInstance> {
  if (current !== undefined) {
    const widgets = sanitizeWidgetLayout<TType, TInstance>(current, registry);
    if (widgets !== null) return { widgets, migrated: false };
  }
  if (legacy !== undefined) {
    const widgets = sanitizeWidgetLayout<TType, TInstance>(
      migrateThreeColumnWidgetLayout(legacy),
      registry,
    );
    if (widgets !== null) return { widgets, migrated: true };
  }
  return {
    widgets: defaultLayout.map((widget) => ({ ...widget })),
    migrated: false,
  };
}
