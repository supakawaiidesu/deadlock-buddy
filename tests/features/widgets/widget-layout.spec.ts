import { describe, expect, it } from 'vitest';
import { sanitizeWidgetLayout } from '@/features/widgets/widget-layout';

describe('widget layout sanitization', () => {
  const validTypes = new Set(['a', 'b']);
  const sizeFor = (type: string) =>
    type === 'a'
      ? { defaultW: 1, defaultH: 6, minW: 1, minH: 6 }
      : { defaultW: 2, defaultH: 4, minW: 1, minH: 3 };

  it('rejects non-array layouts', () => {
    expect(sanitizeWidgetLayout('nope', validTypes, sizeFor)).toBeNull();
    expect(sanitizeWidgetLayout(null, validTypes, sizeFor)).toBeNull();
    expect(sanitizeWidgetLayout({}, validTypes, sizeFor)).toBeNull();
  });

  it('falls back for an empty layout', () => {
    expect(sanitizeWidgetLayout([], validTypes, sizeFor)).toBeNull();
  });

  it('rejects layouts containing only unknown widget types', () => {
    expect(
      sanitizeWidgetLayout([{ id: 'x', type: 'unknown' }], validTypes, sizeFor),
    ).toBeNull();
  });

  it('keeps valid entries in their stored order', () => {
    expect(
      sanitizeWidgetLayout(
        [
          { id: 'x', type: 'a' },
          { id: 'y', type: 'unknown' },
          { id: 'z', type: 'b' },
        ],
        validTypes,
        sizeFor,
      ),
    ).toEqual([
      { id: 'x', type: 'a', x: 0, y: 0, w: 1, h: 6 },
      { id: 'z', type: 'b', x: 0, y: 6, w: 2, h: 4 },
    ]);
  });

  it('drops malformed entries', () => {
    expect(
      sanitizeWidgetLayout(
        [{ id: 7, type: 'a' }, null, 'a', { type: 'a' }, { id: 'ok', type: 'a' }],
        validTypes,
        sizeFor,
      ),
    ).toEqual([{ id: 'ok', type: 'a', x: 0, y: 0, w: 1, h: 6 }]);
  });

  it('migrates legacy entries to default geometry and compacts them', () => {
    expect(
      sanitizeWidgetLayout(
        [
          { id: 'a', type: 'a' },
          { id: 'b', type: 'b' },
        ],
        validTypes,
        sizeFor,
      ),
    ).toEqual([
      { id: 'a', type: 'a', x: 0, y: 0, w: 1, h: 6 },
      { id: 'b', type: 'b', x: 0, y: 6, w: 2, h: 4 },
    ]);
  });

  it('keeps valid coordinates after sanitizing a coordinate layout', () => {
    expect(
      sanitizeWidgetLayout(
        [
          { id: 'a', type: 'a', x: 1, y: 4, w: 1, h: 6 },
          { id: 'b', type: 'b', x: 0, y: 0, w: 2, h: 4 },
        ],
        validTypes,
        sizeFor,
      ),
    ).toEqual([
      { id: 'a', type: 'a', x: 1, y: 4, w: 1, h: 6 },
      { id: 'b', type: 'b', x: 0, y: 0, w: 2, h: 4 },
    ]);
  });

  it('clamps out-of-range coordinates to the registry floor and grid', () => {
    expect(
      sanitizeWidgetLayout(
        [{ id: 'a', type: 'a', x: 9, y: 0, w: 1, h: 1 }],
        validTypes,
        sizeFor,
      ),
    ).toEqual([{ id: 'a', type: 'a', x: 2, y: 0, w: 1, h: 6 }]);
  });
});
