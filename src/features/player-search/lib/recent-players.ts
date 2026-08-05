export const RECENT_PLAYER_IDS_STORAGE_KEY = 'deadlock-buddy-player-recents.v1';
export const MAX_RECENT_PLAYERS = 5;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function sanitizeRecentPlayerIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const sanitized: number[] = [];

  for (const candidate of value) {
    if (!isPositiveInteger(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    sanitized.push(candidate);
    if (sanitized.length === MAX_RECENT_PLAYERS) break;
  }

  return sanitized;
}

export function readRecentPlayerIds(storage: Pick<Storage, 'getItem'>): number[] {
  try {
    const storedValue = storage.getItem(RECENT_PLAYER_IDS_STORAGE_KEY);
    return storedValue ? sanitizeRecentPlayerIds(JSON.parse(storedValue)) : [];
  } catch {
    return [];
  }
}

export function writeRecentPlayerIds(
  storage: Pick<Storage, 'setItem'>,
  ids: readonly number[],
): void {
  try {
    storage.setItem(
      RECENT_PLAYER_IDS_STORAGE_KEY,
      JSON.stringify(sanitizeRecentPlayerIds(ids)),
    );
  } catch {
    // Storage can be unavailable in private browsing or under a quota policy.
  }
}

export function promoteRecentPlayerId(
  ids: readonly number[],
  accountId: number,
): number[] {
  return sanitizeRecentPlayerIds([accountId, ...ids]);
}
