export const GRID_COLUMNS = 3;
export const GRID_ROW_HEIGHT = 20;
export const GRID_GAP = 4;

const GRID_ROW_PITCH = GRID_ROW_HEIGHT + GRID_GAP;

type GridRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GridItem = GridRect & {
  id: string;
};

export type { GridRect };

export function rectsCollide(a: GridRect, b: GridRect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clampRect(rect: GridRect, minW: number, minH: number): GridRect {
  const minWidth = Math.floor(minW);
  const minHeight = Math.floor(minH);
  const w = Math.max(minWidth, Math.min(GRID_COLUMNS, Math.floor(rect.w)));
  const h = Math.max(minHeight, Math.floor(rect.h));
  const x = Math.max(0, Math.min(GRID_COLUMNS - w, Math.floor(rect.x)));
  const y = Math.max(0, Math.floor(rect.y));

  return { x, y, w, h };
}

export function compactVertical<T extends GridItem>(
  items: readonly T[],
  priorityId?: string,
): T[] {
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.y !== b.item.y) return a.item.y - b.item.y;
      if (priorityId) {
        if (a.item.id === priorityId && b.item.id !== priorityId) return -1;
        if (b.item.id === priorityId && a.item.id !== priorityId) return 1;
      }
      if (a.item.x !== b.item.x) return a.item.x - b.item.x;
      return a.index - b.index;
    });

  const placed: GridItem[] = [];
  const byId = new Map<string, T>();

  for (const { item } of ordered) {
    let y = 0;
    while (true) {
      const candidate = { ...item, y };
      const blocker = placed.find((placedItem) => rectsCollide(candidate, placedItem));
      if (!blocker) {
        const next = { ...item, y } as T;
        placed.push(next);
        byId.set(item.id, next);
        break;
      }
      y = blocker.y + blocker.h;
    }
  }

  return items.map((item) => byId.get(item.id) as T);
}

function pushDisplaced<T extends GridItem>(items: T[], anchorId: string): void {
  const anchorIndex = items.findIndex((item) => item.id === anchorId);
  if (anchorIndex === -1) return;

  const pushed = new Set<number>();
  let changed = true;

  while (changed) {
    changed = false;
    const orderedIndices = items
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => index !== anchorIndex)
      .sort((a, b) => {
        if (a.item.y !== b.item.y) return a.item.y - b.item.y;
        if (a.item.x !== b.item.x) return a.item.x - b.item.x;
        return a.index - b.index;
      });

    for (const { index } of orderedIndices) {
      const item = items[index];
      const colliders: GridItem[] = [items[anchorIndex]];

      for (const pushedIndex of pushed) {
        if (pushedIndex !== index) colliders.push(items[pushedIndex]);
      }

      const greatestBottom = colliders.reduce((bottom, collider) => {
        return rectsCollide(item, collider) ? Math.max(bottom, collider.y + collider.h) : bottom;
      }, item.y);

      if (greatestBottom > item.y) {
        items[index] = { ...item, y: greatestBottom };
        pushed.add(index);
        changed = true;
        break;
      }
    }
  }
}

export function moveItem<T extends GridItem>(
  items: readonly T[],
  id: string,
  to: { x: number; y: number },
  minW: number,
  minH: number,
): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return [...items];

  const next = items.map((item, itemIndex) => {
    if (itemIndex !== index) return { ...item } as T;
    return { ...item, ...clampRect({ ...item, ...to }, minW, minH) } as T;
  });

  pushDisplaced(next, id);
  return compactVertical(next, id);
}

function clampResizeRect(
  item: GridItem,
  size: { w: number; h: number },
  minW: number,
  minH: number,
): GridRect {
  const clamped = clampRect({ ...item, ...size }, minW, minH);
  const x = Math.max(0, Math.min(GRID_COLUMNS - minW, Math.floor(item.x)));
  return {
    ...clamped,
    x,
    w: Math.min(clamped.w, GRID_COLUMNS - x),
  };
}

export function resizeItem<T extends GridItem>(
  items: readonly T[],
  id: string,
  size: { w: number; h: number },
  minW: number,
  minH: number,
): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return [...items];

  const next = items.map((item, itemIndex) => {
    if (itemIndex !== index) return { ...item } as T;
    return { ...item, ...clampResizeRect(item, size, minW, minH) } as T;
  });

  pushDisplaced(next, id);
  return compactVertical(next, id);
}

export function findFreeSlot(
  items: readonly GridItem[],
  w: number,
  h: number,
): { x: number; y: number } {
  for (let y = 0; ; y += 1) {
    for (let x = 0; x <= GRID_COLUMNS - w; x += 1) {
      const candidate = { id: '__candidate__', x, y, w, h };
      if (!items.some((item) => rectsCollide(candidate, item))) {
        return { x, y };
      }
    }
  }
}

export function gridHeightPx(items: readonly GridItem[]): number {
  if (items.length === 0) return 0;

  const maxBottom = items.reduce(
    (bottom, item) => Math.max(bottom, item.y + item.h),
    0,
  );
  return maxBottom * GRID_ROW_PITCH - GRID_GAP;
}

export function columnWidthPx(containerWidth: number): number {
  return (containerWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
}

export function rectToPixels(
  rect: GridRect,
  containerWidth: number,
): { left: number; top: number; width: number; height: number } {
  const colW = columnWidthPx(containerWidth);

  return {
    left: rect.x * (colW + GRID_GAP),
    top: rect.y * GRID_ROW_PITCH,
    width: rect.w * colW + (rect.w - 1) * GRID_GAP,
    height: rect.h * GRID_ROW_HEIGHT + (rect.h - 1) * GRID_GAP,
  };
}
