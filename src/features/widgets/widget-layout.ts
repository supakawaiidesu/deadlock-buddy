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
): WidgetInstance<TType>[] | null {
  if (!Array.isArray(raw)) return null;

  const cleaned: WidgetInstance<TType>[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, type } = item as Partial<WidgetInstance<TType>>;
    if (typeof id !== 'string' || typeof type !== 'string') continue;
    if (!validTypes.has(type)) continue;
    cleaned.push({ id, type });
  }

  if (cleaned.length === 0) return null;
  return cleaned;
}
