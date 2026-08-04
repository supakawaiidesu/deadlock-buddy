// `BigInt('…')` rather than a `…n` literal: the repo targets ES2017, where
// BigInt literals are a syntax error even though the runtime lib provides BigInt.
const STEAM64_OFFSET = BigInt('76561197960265728');

/**
 * Convert a SteamID3 (`account_id`, a.k.a. steam32) to a SteamID64 string.
 *
 * SteamID64 values exceed `Number.MAX_SAFE_INTEGER`, so the math runs through
 * `BigInt` and the result stays a string. Returns `null` for non-positive or
 * non-integer input rather than throwing, because the only callers are React
 * render paths where a thrown error would blank the page.
 */
export function toSteam64(accountId: number): string | null {
  if (!Number.isInteger(accountId) || accountId <= 0) return null;

  return (BigInt(accountId) + STEAM64_OFFSET).toString();
}

/** Canonical Steam Community profile URL. Valve keys public profile URLs on SteamID64. */
export function steamProfileUrl(steam64: string): string {
  return `https://steamcommunity.com/profiles/${steam64}/`;
}
