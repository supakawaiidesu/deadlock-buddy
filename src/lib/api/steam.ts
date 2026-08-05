import { apiRequest } from './client';
import {
  SteamLookupResponseSchema,
  SteamProfilesResponseSchema,
  type SteamProfile,
} from './schema';

/**
 * Base URL of the Steam identity service. Valve's Web API requires a secret key
 * and sends no CORS headers, so identity data is proxied by our own service.
 *
 * Unset means the feature is unavailable; callers must gate on `hasSteamService`
 * rather than issuing a request against `undefined`.
 */
export const steamApiBaseUrl: string | undefined = import.meta.env.VITE_STEAM_API_BASE;

export const hasSteamService = Boolean(steamApiBaseUrl);

/**
 * Fetch Steam identity for a batch of `account_id`s (SteamID3 / steam32).
 *
 * The service omits ids Steam does not know, so the returned array may be
 * shorter than `accountIds` and is not guaranteed to preserve order.
 */
export async function fetchSteamProfiles(accountIds: readonly number[]): Promise<SteamProfile[]> {
  if (!steamApiBaseUrl) {
    throw new Error('VITE_STEAM_API_BASE is not configured');
  }

  const ids = accountIds.filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return [];

  const result = await apiRequest<unknown>({
    baseUrl: steamApiBaseUrl,
    path: '/steam/profiles',
    searchParams: {
      account_ids: ids.join(','),
    },
  });

  return SteamProfilesResponseSchema.parse(result).profiles;
}

/**
 * Resolve a flexible Steam identifier through the Steam identity service.
 *
 * The service owns parsing Steam32/64, Steam2/3, profile URLs, and vanity
 * names. The input is intentionally sent unchanged after the form trims it.
 */
export async function fetchSteamLookup(input: string): Promise<SteamProfile> {
  if (!steamApiBaseUrl) {
    throw new Error('VITE_STEAM_API_BASE is not configured');
  }

  const result = await apiRequest<unknown>({
    baseUrl: steamApiBaseUrl,
    path: '/steam/lookup',
    searchParams: {
      q: input,
      extended: 0,
    },
  });

  return SteamLookupResponseSchema.parse(result).profile;
}

/**
 * Fetch Steam identity for a single account. Resolves to `null` when Steam has
 * no such account — an absent profile is a valid outcome, not a failure.
 */
export async function fetchSteamProfile(accountId: number): Promise<SteamProfile | null> {
  const profiles = await fetchSteamProfiles([accountId]);

  return profiles.find((profile) => profile.account_id === accountId) ?? null;
}
