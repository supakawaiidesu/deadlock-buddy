import type { ReactNode } from 'react';
import { ExternalLink, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlayerRank, useSteamProfile } from '@/features/players/api/queries';
import { resolveRankBadge } from '@/lib/data/ranks';
import { formatDate } from '@/lib/utils/format';
import { steamProfileUrl, toSteam64 } from '@/lib/utils/steam-id';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import {
  deriveVacState,
  formatVacLabel,
  resolveDisplayName,
  type VacState,
} from '../lib/steam-identity';

type Props = {
  accountId: number;
};

const VAC_ICON: Record<VacState, ReactNode> = {
  clean: <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  banned: <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  unknown: <ShieldQuestion className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
};

const VAC_COLOR: Record<VacState, string> = {
  clean: 'text-[var(--accent)]',
  banned: 'text-[var(--danger)]',
  unknown: 'text-[rgb(var(--text-rgb)/0.45)]',
};

/** Shared label treatment for the identity row's cells. */
const CELL_LABEL =
  'text-[10px] font-medium uppercase tracking-[0.24em] text-[rgb(var(--text-rgb)/0.5)]';

export function PlayerIdentityPanel({ accountId }: Props) {
  const rankQuery = usePlayerRank(accountId);
  const rank = resolveRankBadge(rankQuery.data);
  const steamQuery = useSteamProfile(accountId);
  const profile = steamQuery.data ?? null;
  const vacState = deriveVacState(profile);
  const vacLabel = formatVacLabel(vacState, profile);
  const displayName = resolveDisplayName(profile, accountId);
  // Prefer the service's own profile_url (it resolves vanity URLs); fall back to
  // deriving one so the Steam link survives an identity-service outage.
  const steam64 = profile?.steam_id_64 ?? toSteam64(accountId);
  const profileUrl = profile?.profile_url ?? (steam64 ? steamProfileUrl(steam64) : null);

  return (
    <Panel className="flex flex-col gap-0 !p-0">
      {/* ── identity row: avatar owns the left edge, cells share borders ── */}
      <div className="flex min-h-[112px]">
        {/* avatar: owns the entire left edge, full-bleed (no inner padding/crop box) */}
        <div className="relative w-28 shrink-0 self-stretch overflow-hidden border-r border-[var(--surface-border-muted)]">
          {steamQuery.isLoading ? (
            <Skeleton className="absolute inset-0 h-full w-full" />
          ) : profile?.avatar_full_url ? (
            <img
              src={profile.avatar_full_url}
              alt={`${displayName} Steam avatar`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--surface-muted)]" />
          )}
        </div>

        {/* name / status / since: adjacent full-height cells sharing edges */}
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
            {steamQuery.isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : profileUrl ? (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-w-0 items-center gap-1.5 text-base font-semibold text-[var(--text-strong)]"
                title={`Open Steam profile for ${displayName}`}
              >
                <span className="truncate">{displayName}</span>
                <ExternalLink
                  className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-rgb)/0.45)]"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens Steam profile in a new tab)</span>
              </a>
            ) : (
              <p className="truncate text-base font-semibold text-[var(--text-strong)]">
                {displayName}
              </p>
            )}
            {profile?.real_name ? (
              <p className="truncate text-xs text-[rgb(var(--text-rgb)/0.55)]">
                {profile.real_name}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col justify-center gap-1 border-t border-[var(--surface-border-muted)] px-4 py-3 sm:border-l sm:border-t-0">
            <span className={CELL_LABEL}>Rank</span>
            {rankQuery.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <span
                className="whitespace-nowrap text-sm font-semibold"
                style={{ color: rank.color }}
              >
                {rank.label}
              </span>
            )}
          </div>

          <div className="flex shrink-0 flex-col justify-center gap-1 border-t border-[var(--surface-border-muted)] px-4 py-3 sm:border-l sm:border-t-0">
            <span className={CELL_LABEL}>Status</span>
            <span className={clsx('flex items-center gap-1.5 text-sm font-semibold', VAC_COLOR[vacState])}>
              {VAC_ICON[vacState]}
              <span className="whitespace-nowrap">{vacLabel}</span>
            </span>
          </div>

          <div className="flex shrink-0 flex-col justify-center gap-1 border-t border-[var(--surface-border-muted)] px-4 py-3 sm:border-l sm:border-t-0">
            <span className={CELL_LABEL}>Member since</span>
            <span className="whitespace-nowrap text-sm font-semibold text-[var(--text-strong)]">
              {formatDate(profile?.time_created)}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
