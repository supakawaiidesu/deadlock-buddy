import { describe, expect, it } from 'vitest';
import { sanitizeWidgetLayout } from '@/features/widgets/widget-layout';

describe('widget layout sanitization', () => {
  const validTypes = new Set(['a', 'b']);

  it('rejects non-array layouts', () => {
    expect(sanitizeWidgetLayout('nope', validTypes)).toBeNull();
    expect(sanitizeWidgetLayout(null, validTypes)).toBeNull();
    expect(sanitizeWidgetLayout({}, validTypes)).toBeNull();
  });

  it('falls back for an empty layout', () => {
    expect(sanitizeWidgetLayout([], validTypes)).toBeNull();
  });

  it('rejects layouts containing only unknown widget types', () => {
    expect(sanitizeWidgetLayout([{ id: 'x', type: 'unknown' }], validTypes)).toBeNull();
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
      ),
    ).toEqual([
      { id: 'x', type: 'a' },
      { id: 'z', type: 'b' },
    ]);
  });

  it('drops malformed entries', () => {
    expect(
      sanitizeWidgetLayout(
        [{ id: 7, type: 'a' }, null, 'a', { type: 'a' }, { id: 'ok', type: 'a' }],
        validTypes,
      ),
    ).toEqual([{ id: 'ok', type: 'a' }]);
  });
});
