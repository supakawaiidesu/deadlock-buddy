import { describe, expect, it } from 'vitest';
import {
  migrateThreeColumnWidgetLayout,
  resolveStoredWidgetLayout,
  sanitizeWidgetLayout,
} from '@/features/widgets/widget-layout';
import type {
  WidgetDefinition,
  WidgetGridWidth,
  WidgetInstance,
} from '@/features/widgets/widget-types';

const registry: Record<string, WidgetDefinition<string, unknown>> = {
  a: definition('a', { defaultW: 4, defaultH: 6 }),
  b: definition('b', { defaultW: 8, defaultH: 4 }),
};

function definition(
  type: string,
  size: { defaultW: WidgetGridWidth; defaultH: number },
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
      { id: 'x', type: 'a', x: 0, y: 0, w: 4, h: 6 },
      { id: 'z', type: 'b', x: 0, y: 6, w: 8, h: 4 },
    ]);
  });

  it('drops malformed entries', () => {
    expect(sanitizeWidgetLayout(
      [{ id: 7, type: 'a' }, null, 'a', { type: 'a' }, { id: 'ok', type: 'a' }],
      registry,
    )).toEqual([{ id: 'ok', type: 'a', x: 0, y: 0, w: 4, h: 6 }]);
  });

  it('clamps coordinates to the mechanical floor and grid', () => {
    expect(sanitizeWidgetLayout(
      [
        { id: 'right', type: 'a', x: 11, y: 0, w: 1, h: 3 },
        { id: 'floor', type: 'b', x: 0, y: 20, w: 0, h: 1 },
      ],
      registry,
    )).toEqual([
      { id: 'right', type: 'a', x: 11, y: 0, w: 1, h: 3 },
      { id: 'floor', type: 'b', x: 0, y: 0, w: 1, h: 3 },
    ]);
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
        defaultW: 4,
        defaultH: 3,
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

    const raw = [{
      id: 'configured',
      type: 'configured',
      x: 1,
      y: 0,
      w: 2,
      h: 4,
      setting: 'kept',
      future: true,
    }];
    expect(migrateThreeColumnWidgetLayout(raw)).toEqual([{
      ...raw[0],
      x: 4,
      w: 8,
    }]);
    expect(sanitizeWidgetLayout<'configured', ConfiguredInstance>(
      migrateThreeColumnWidgetLayout(raw),
      configured,
    )).toEqual([
      { id: 'configured', type: 'configured', x: 4, y: 0, w: 8, h: 4, setting: 'kept' },
    ]);
  });

  it('lets missing legacy geometry fall directly to current defaults', () => {
    expect(sanitizeWidgetLayout(
      migrateThreeColumnWidgetLayout([{ id: 'legacy', type: 'b', x: 1, h: 4 }]),
      registry,
    )).toEqual([{ id: 'legacy', type: 'b', x: 0, y: 0, w: 8, h: 4 }]);
  });

  it('resolves current, legacy, and default layouts without merging', () => {
    const defaults = [{ id: 'default', type: 'a', x: 0, y: 0, w: 4, h: 6 }];
    const legacy = [{ id: 'legacy', type: 'b', x: 1, y: 0, w: 2, h: 4 }];
    const current = [{ id: 'current', type: 'a', x: 1, y: 0, w: 1, h: 3 }];

    expect(resolveStoredWidgetLayout({ current, legacy, defaultLayout: defaults, registry }))
      .toEqual({ widgets: current, migrated: false });
    expect(resolveStoredWidgetLayout({ current: [], legacy, defaultLayout: defaults, registry }))
      .toEqual({ widgets: [], migrated: false });
    expect(resolveStoredWidgetLayout({
      current: undefined,
      legacy,
      defaultLayout: defaults,
      registry,
    })).toEqual({
      widgets: [{ id: 'legacy', type: 'b', x: 4, y: 0, w: 8, h: 4 }],
      migrated: true,
    });
    expect(resolveStoredWidgetLayout({
      current: 'bad',
      legacy: [],
      defaultLayout: defaults,
      registry,
    })).toEqual({ widgets: [], migrated: true });
    expect(resolveStoredWidgetLayout({
      current: 'bad',
      legacy: 'bad',
      defaultLayout: defaults,
      registry,
    })).toEqual({ widgets: defaults, migrated: false });
  });
});
