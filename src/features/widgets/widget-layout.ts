import { clampRect, compactVertical } from '@/features/widgets/widget-engine';
import type { WidgetInstance } from '@/features/widgets/widget-types';

export function createWidgetInstanceId(type: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${type}-${crypto.randomUUID()}`;
  }
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeWidgetLayout<TType extends string>(
  raw: unknown,
  validTypes: ReadonlySet<string>,
  sizeFor: (
    type: TType,
  ) => { defaultW: number; defaultH: number; minW: number; minH: number },
): WidgetInstance<TType>[] | null {
  if (!Array.isArray(raw)) return null;

  const cleaned: WidgetInstance<TType>[] = [];
  const seenIds = new Set<string>();

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue;

    const { id, type } = item as Partial<WidgetInstance<TType>>;
    if (typeof id !== 'string' || typeof type !== 'string') continue;
    if (!validTypes.has(type) || seenIds.has(id)) continue;

    const definition = sizeFor(type as TType);
    const candidate = item as Partial<WidgetInstance<TType>>;
    const hasCoordinates = [candidate.x, candidate.y, candidate.w, candidate.h].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    );
    const rect = hasCoordinates
      ? clampRect(
          {
            x: candidate.x as number,
            y: candidate.y as number,
            w: candidate.w as number,
            h: candidate.h as number,
          },
          definition.minW,
          definition.minH,
        )
      : clampRect(
          {
            x: 0,
            y: index * 1000,
            w: definition.defaultW,
            h: definition.defaultH,
          },
          definition.minW,
          definition.minH,
        );

    seenIds.add(id);
    cleaned.push({ id, type: type as TType, ...rect });
  }

  if (cleaned.length === 0) return null;
  return compactVertical(cleaned);
}
