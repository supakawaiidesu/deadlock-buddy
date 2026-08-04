import type { SteamProfile } from '@/lib/api/schema';

/**
 * Ban posture for the identity panel's shield.
 *
 * `unknown` is load-bearing: the identity service reports every ban field as
 * `null` when its lookup against Valve fails. Collapsing that into `clean`
 * would show a green "VAC clean" shield for an account nobody checked.
 */
export type VacState = 'clean' | 'banned' | 'unknown';

export function deriveVacState(profile: Pick<
  SteamProfile,
  'vac_banned' | 'game_ban_count'
> | null | undefined): VacState {
  if (!profile || profile.vac_banned === null) return 'unknown';
  if (profile.vac_banned) return 'banned';

  return (profile.game_ban_count ?? 0) > 0 ? 'banned' : 'clean';
}

export function formatVacLabel(
  state: VacState,
  profile: Pick<SteamProfile, 'vac_ban_count' | 'game_ban_count'> | null | undefined,
): string {
  if (state === 'unknown') return 'VAC Unknown';
  if (state === 'clean') return 'VAC Clean';

  const parts: string[] = [];
  const vacBans = profile?.vac_ban_count ?? 0;
  const gameBans = profile?.game_ban_count ?? 0;

  if (vacBans > 0) parts.push(`${vacBans} VAC`);
  if (gameBans > 0) parts.push(`${gameBans} Game`);

  return parts.length > 0 ? `Banned \u00B7 ${parts.join(' \u00B7 ')}` : 'Banned';
}

/** Display name with a stable fallback so the header never renders empty. */
export function resolveDisplayName(
  profile: Pick<SteamProfile, 'persona_name'> | null | undefined,
  accountId: number,
): string {
  const persona = profile?.persona_name?.trim();

  return persona ? persona : `Account ${accountId}`;
}
