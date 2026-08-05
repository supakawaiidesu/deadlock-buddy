import { describe, expect, it } from 'vitest';
import {
  compactVertical,
  findFreeSlot,
  gridHeightPx,
  moveItem,
  rectsCollide,
  resizeItem,
} from '@/features/widgets/widget-engine';

describe('widget layout engine', () => {
  it('detects overlap without treating touching edges as collisions', () => {
    expect(
      rectsCollide(
        { x: 0, y: 0, w: 2, h: 2 },
        { x: 1, y: 1, w: 2, h: 2 },
      ),
    ).toBe(true);
    expect(
      rectsCollide(
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 1, y: 0, w: 1, h: 1 },
      ),
    ).toBe(false);
    expect(
      rectsCollide(
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 0, y: 1, w: 1, h: 1 },
      ),
    ).toBe(false);
  });

  it('gravity-compacts short columns independently of taller neighbors', () => {
    const result = compactVertical([
      { id: 'top-heroes', x: 0, y: 0, w: 1, h: 11 },
      { id: 'hero-performance', x: 1, y: 0, w: 2, h: 13 },
      { id: 'profile-signals', x: 0, y: 40, w: 1, h: 13 },
    ]);

    expect(result.find((item) => item.id === 'profile-signals')?.y).toBe(11);
  });

  it('returns compacted items in their original input order', () => {
    const result = compactVertical([
      { id: 'profile-signals', x: 0, y: 40, w: 1, h: 13 },
      { id: 'hero-performance', x: 1, y: 0, w: 2, h: 13 },
      { id: 'top-heroes', x: 0, y: 0, w: 1, h: 11 },
    ]);

    expect(result.map((item) => item.id)).toEqual([
      'profile-signals',
      'hero-performance',
      'top-heroes',
    ]);
    expect(result[0]?.y).toBe(11);
  });

  it('pushes displaced widgets and clamps a move to the grid', () => {
    const result = moveItem(
      [
        { id: 'anchor', x: 2, y: 0, w: 1, h: 2 },
        { id: 'occupant', x: 0, y: 0, w: 1, h: 2 },
      ],
      'anchor',
      { x: -2, y: 0 },
      1,
      1,
    );

    expect(result.find((item) => item.id === 'anchor')).toMatchObject({ x: 0, y: 0 });
    expect(result.find((item) => item.id === 'occupant')).toMatchObject({ x: 0, y: 2 });
  });

  it('clamps resize bounds and pushes a neighbor below the expanded widget', () => {
    const result = resizeItem(
      [
        { id: 'anchor', x: 0, y: 0, w: 1, h: 2 },
        { id: 'neighbor', x: 1, y: 0, w: 1, h: 2 },
      ],
      'anchor',
      { w: 2, h: 1 },
      1,
      3,
    );

    expect(result.find((item) => item.id === 'anchor')).toMatchObject({
      x: 0,
      y: 0,
      w: 2,
      h: 3,
    });
    expect(result.find((item) => item.id === 'neighbor')).toMatchObject({ y: 3 });

    expect(
      resizeItem(
        [{ id: 'right-edge', x: 2, y: 0, w: 1, h: 2 }],
        'right-edge',
        { w: 3, h: 2 },
        1,
        1,
      )[0],
    ).toMatchObject({ x: 2, w: 1 });
  });

  it('finds the first interior gap before scanning below the layout', () => {
    expect(
      findFreeSlot(
        [
          { id: 'left', x: 0, y: 0, w: 1, h: 1 },
          { id: 'right', x: 2, y: 0, w: 1, h: 1 },
        ],
        1,
        1,
      ),
    ).toEqual({ x: 1, y: 0 });

    expect(
      findFreeSlot(
        [
          { id: 'left', x: 0, y: 0, w: 1, h: 1 },
          { id: 'middle', x: 1, y: 0, w: 1, h: 1 },
          { id: 'right', x: 2, y: 0, w: 1, h: 1 },
        ],
        1,
        1,
      ),
    ).toEqual({ x: 0, y: 1 });
  });

  it('calculates the coordinate surface height', () => {
    expect(gridHeightPx([])).toBe(0);
    expect(gridHeightPx([{ id: 'top-heroes', x: 0, y: 0, w: 1, h: 11 }])).toBe(260);
  });
});
