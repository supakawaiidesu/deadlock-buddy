import { describe, expect, it } from 'vitest';
import {
  compactVertical,
  findFreeSlot,
  gridHeightPx,
  moveItem,
  rectsCollide,
  rectToPixels,
  resizeItem,
} from '@/features/widgets/widget-engine';

describe('widget layout engine', () => {
  it('detects overlap without treating touching edges as collisions', () => {
    expect(rectsCollide(
      { x: 0, y: 0, w: 8, h: 3 },
      { x: 4, y: 1, w: 8, h: 3 },
    )).toBe(true);
    expect(rectsCollide(
      { x: 0, y: 0, w: 4, h: 3 },
      { x: 4, y: 0, w: 4, h: 3 },
    )).toBe(false);
    expect(rectsCollide(
      { x: 0, y: 0, w: 4, h: 3 },
      { x: 0, y: 3, w: 4, h: 3 },
    )).toBe(false);
  });

  it('gravity-compacts short columns independently of taller neighbors', () => {
    const result = compactVertical([
      { id: 'top-heroes', x: 0, y: 0, w: 4, h: 11 },
      { id: 'hero-performance', x: 4, y: 0, w: 8, h: 13 },
      { id: 'match-history', x: 0, y: 40, w: 4, h: 13 },
    ]);

    expect(result.find((item) => item.id === 'match-history')?.y).toBe(11);
  });

  it('returns compacted items in their original input order', () => {
    const result = compactVertical([
      { id: 'match-history', x: 0, y: 40, w: 4, h: 13 },
      { id: 'hero-performance', x: 4, y: 0, w: 8, h: 13 },
      { id: 'top-heroes', x: 0, y: 0, w: 4, h: 11 },
    ]);

    expect(result.map((item) => item.id)).toEqual([
      'match-history',
      'hero-performance',
      'top-heroes',
    ]);
    expect(result[0]?.y).toBe(11);
  });

  it('moves by one twelfth and pushes displaced widgets', () => {
    const result = moveItem(
      [
        { id: 'anchor', x: 4, y: 0, w: 4, h: 3 },
        { id: 'occupant', x: 8, y: 0, w: 4, h: 3 },
      ],
      'anchor',
      { x: 5, y: 0 },
    );

    expect(result.find((item) => item.id === 'anchor')).toMatchObject({ x: 5, y: 0 });
    expect(result.find((item) => item.id === 'occupant')).toMatchObject({ x: 8, y: 3 });
  });

  it('floors resize bounds and pushes a neighbor below an expansion', () => {
    const floored = resizeItem(
      [{ id: 'full', x: 0, y: 0, w: 12, h: 18 }],
      'full',
      { w: 0, h: 0 },
    );
    expect(floored[0]).toMatchObject({ x: 0, y: 0, w: 1, h: 3 });

    const expanded = resizeItem(
      [
        { id: 'anchor', x: 0, y: 0, w: 4, h: 3 },
        { id: 'neighbor', x: 4, y: 0, w: 4, h: 3 },
      ],
      'anchor',
      { w: 8, h: 3 },
    );
    expect(expanded.find((item) => item.id === 'anchor')).toMatchObject({ w: 8, h: 3 });
    expect(expanded.find((item) => item.id === 'neighbor')).toMatchObject({ y: 3 });

    expect(resizeItem(
      [{ id: 'right-edge', x: 11, y: 0, w: 1, h: 3 }],
      'right-edge',
      { w: 12, h: 3 },
    )[0]).toMatchObject({ x: 11, w: 1 });
  });

  it('preserves object identity for widgets whose geometry does not change', () => {
    const anchor = { id: 'anchor', x: 0, y: 0, w: 4, h: 3 };
    const untouched = { id: 'untouched', x: 8, y: 0, w: 4, h: 3 };

    const moved = moveItem([anchor, untouched], 'anchor', { x: 4, y: 0 });
    const resized = resizeItem([anchor, untouched], 'anchor', { w: 4, h: 4 });

    expect(moved[1]).toBe(untouched);
    expect(resized[1]).toBe(untouched);
  });

  it('preserves object identity when compaction leaves geometry unchanged', () => {
    const first = { id: 'first', x: 0, y: 0, w: 4, h: 3 };
    const second = { id: 'second', x: 4, y: 0, w: 4, h: 3 };

    const compacted = compactVertical([first, second]);

    expect(compacted[0]).toBe(first);
    expect(compacted[1]).toBe(second);
  });

  it('finds an interior twelfth gap before scanning below the layout', () => {
    expect(findFreeSlot(
      [
        { id: 'left', x: 0, y: 0, w: 4, h: 3 },
        { id: 'right', x: 8, y: 0, w: 4, h: 3 },
      ],
      4,
      3,
    )).toEqual({ x: 4, y: 0 });

    expect(findFreeSlot(
      [{ id: 'full', x: 0, y: 0, w: 12, h: 3 }],
      4,
      3,
    )).toEqual({ x: 0, y: 3 });
  });

  it('calculates the coordinate surface height', () => {
    expect(gridHeightPx([])).toBe(0);
    expect(gridHeightPx([{ id: 'top-heroes', x: 0, y: 0, w: 4, h: 11 }])).toBe(260);
  });

  it('preserves legacy pixel geometry after four-times coordinate mapping', () => {
    expect(rectToPixels({ x: 4, y: 2, w: 8, h: 3 }, 860)).toEqual({
      left: 288,
      top: 48,
      width: 572,
      height: 68,
    });
  });
});
