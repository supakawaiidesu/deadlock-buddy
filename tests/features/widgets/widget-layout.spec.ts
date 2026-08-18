import { describe, expect, it } from 'vitest';
import { sanitizeWidgetLayout } from '@/features/widgets/widget-layout';
import type { WidgetDefinition, WidgetInstance } from '@/features/widgets/widget-types';

const registry: Record<string, WidgetDefinition<string, unknown>> = {
  a: definition('a', { defaultW: 1, defaultH: 6, minW: 1, minH: 6 }),
  b: definition('b', { defaultW: 2, defaultH: 4, minW: 1, minH: 3 }),
};

function definition(
  type: string,
  size: { defaultW: 1 | 2 | 3; defaultH: number; minW: 1 | 2 | 3; minH: number },
): WidgetDefinition<string, unknown> {
  return {
    type,
    title: type,
    preview: null,
    ...size,
    createInstance: (id, rect) => ({ id, type, ...rect }),
    sanitizeInstance: (raw, rect) => {
      const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
        ? raw.id
        : '';
      return { id, type, ...rect };
    },
    render: () => null,
  };
}

describe('widget layout sanitization', () => {
  it('rejects non-array layouts', () => {
    expect(sanitizeWidgetLayout('nope', registry)).toBeNull();
    expect(sanitizeWidgetLayout(null, registry)).toBeNull();
    expect(sanitizeWidgetLayout({}, registry)).toBeNull();
  });

  it('keeps an explicitly empty layout', () => {
    expect(sanitizeWidgetLayout([], registry)).toEqual([]);
  });

  it('rejects layouts containing only unknown widget types', () => {
    expect(sanitizeWidgetLayout([{ id: 'x', type: 'unknown' }], registry)).toBeNull();
  });

  it('keeps valid entries in stored order and delegates reconstruction', () => {
    expect(sanitizeWidgetLayout(
      [
        { id: 'x', type: 'a' },
        { id: 'y', type: 'unknown' },
        { id: 'z', type: 'b' },
      ],
      registry,
    )).toEqual([
      { id: 'x', type: 'a', x: 0, y: 0, w: 1, h: 6 },
      { id: 'z', type: 'b', x: 0, y: 6, w: 2, h: 4 },
    ]);
  });

  it('drops malformed entries', () => {
    expect(sanitizeWidgetLayout(
      [{ id: 7, type: 'a' }, null, 'a', { type: 'a' }, { id: 'ok', type: 'a' }],
      registry,
    )).toEqual([{ id: 'ok', type: 'a', x: 0, y: 0, w: 1, h: 6 }]);
  });

  it('clamps coordinates to the registry floor and grid', () => {
    expect(sanitizeWidgetLayout(
      [{ id: 'a', type: 'a', x: 9, y: 0, w: 1, h: 1 }],
      registry,
    )).toEqual([{ id: 'a', type: 'a', x: 2, y: 0, w: 1, h: 6 }]);
  });

  it('preserves extension fields through a registry sanitizer', () => {
    type ConfiguredInstance = WidgetInstance<'configured'> & { setting: string };
    const configured: Record<
      string,
      WidgetDefinition<'configured', unknown, ConfiguredInstance>
    > = {
      configured: {
        type: 'configured',
        title: 'Configured',
        preview: null,
        defaultW: 1,
        defaultH: 3,
        minW: 1,
        minH: 3,
        createInstance: (id, rect) => ({ id, type: 'configured', ...rect, setting: 'default' }),
        sanitizeInstance: (raw, rect) => {
          const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
            ? raw.id
            : '';
          const setting = raw && typeof raw === 'object' && 'setting' in raw &&
            typeof raw.setting === 'string' ? raw.setting : 'default';
          return { id, type: 'configured', ...rect, setting };
        },
        render: () => null,
      },
    };

    expect(sanitizeWidgetLayout<'configured', ConfiguredInstance>([
      { id: 'configured', type: 'configured', x: 0, y: 0, w: 1, h: 3, setting: 'kept' },
    ], configured)).toEqual([
      { id: 'configured', type: 'configured', x: 0, y: 0, w: 1, h: 3, setting: 'kept' },
    ]);
  });
});
