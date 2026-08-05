import { Shield, ShieldQuestion } from 'lucide-react';
import { useMemo } from 'react';
import {
  usePlayerHeroStats,
  usePlayerRank,
  useSteamProfiles,
} from '@/features/players/api/queries';
import {
  getRecentTopHeroIds,
  truncateRecentPlayerName,
} from '@/features/player-search/lib/recent-player-display';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { getRankBadgeImageUrl, resolveRankBadge } from '@/lib/data/ranks';
import { Skeleton } from '@/ui/skeleton';
import type { SteamProfile } from '@/lib/api/schema';

type RecentPlayerListProps = {
  accountIds: readonly number[];
  onOpen: (accountId: number) => void;
};

type RecentPlayerRowProps = {
  accountId: number;
  identityLoading: boolean;
  profile: SteamProfile | undefined;
  onOpen: (accountId: number) => void;
};

type RecentHeroIconsProps = {
  heroIds: readonly number[];
  isLoading: boolean;
};

function RecentHeroIcons({ heroIds, isLoading }: RecentHeroIconsProps) {
  if (isLoading) {
    return (
      <span className="flex shrink-0 items-center gap-1.5" aria-label="Loading top heroes">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-7 w-7" />
        ))}
      </span>
    );
  }

  const heroIcons = heroIds
    .map((heroId) => {
      const iconUrl = getHeroIconUrl(heroId);
      return iconUrl
        ? { heroId, iconUrl, name: getHeroDisplayName(heroId) }
        : null;
    })
    .filter((hero): hero is NonNullable<typeof hero> => hero !== null);

  if (heroIcons.length === 0) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-1.5"
      aria-label={`Top ${heroIcons.length} heroes`}
    >
      {heroIcons.map((hero) => (
        <img
          key={hero.heroId}
          src={hero.iconUrl}
          alt={hero.name}
          title={hero.name}
          width={28}
          height={28}
          className="h-7 w-7 object-cover"
        />
      ))}
    </span>
  );
}

function RecentPlayerRow({
  accountId,
  identityLoading,
  profile,
  onOpen,
}: RecentPlayerRowProps) {
  const rankQuery = usePlayerRank(accountId);
  const heroStatsQuery = usePlayerHeroStats(accountId);
  const rank = resolveRankBadge(rankQuery.data);
  const topHeroIds = useMemo(
    () => (heroStatsQuery.data ? getRecentTopHeroIds(heroStatsQuery.data) : []),
    [heroStatsQuery.data],
  );
  const displayName = profile?.persona_name?.trim() || String(accountId);
  const visibleName = truncateRecentPlayerName(displayName);
  const realName = profile?.real_name?.trim() || null;
  const rankLabel = rankQuery.isError ? 'Rank unavailable' : rank.label;
  const rankImageUrl =
    !rankQuery.isError && rankQuery.data ? getRankBadgeImageUrl(rankQuery.data) : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(accountId)}
      aria-label={`Open player ${displayName}`}
      className="panel-header-interactive flex h-16 w-full min-w-0 items-stretch border-b border-[var(--surface-border-muted)] text-left last:border-b-0"
    >
      <span className="relative h-16 w-16 shrink-0 self-stretch overflow-hidden border-r border-[var(--surface-border-muted)]">
        {identityLoading ? (
          <Skeleton className="absolute inset-0 h-full w-full" />
        ) : profile?.avatar_full_url ? (
          <img
            src={profile.avatar_full_url}
            alt={`${displayName} Steam avatar`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 bg-[var(--surface-muted)]" aria-hidden="true" />
        )}
      </span>

      <span className="flex min-w-0 flex-1 items-stretch">
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
          {identityLoading ? (
            <Skeleton className="h-4 w-32 max-w-full" />
          ) : (
            <span
              className="truncate text-sm font-semibold text-[var(--text-strong)]"
              title={displayName}
            >
              {visibleName}
            </span>
          )}
          {realName ? (
            <span
              className="min-w-0 truncate text-xs text-[rgb(var(--text-rgb)/0.55)]"
              title={realName}
            >
              {realName}
            </span>
          ) : null}
        </span>

        {heroStatsQuery.isLoading || topHeroIds.length > 0 ? (
          <span className="flex h-full shrink-0 items-center border-l border-[var(--surface-border-muted)] px-3">
            <RecentHeroIcons
              heroIds={topHeroIds}
              isLoading={heroStatsQuery.isLoading}
            />
          </span>
        ) : null}

        <span
          role="img"
          aria-label={rankQuery.isLoading ? 'Loading rank' : `Rank: ${rankLabel}`}
          title={rankLabel}
          className="flex h-full w-12 shrink-0 items-center justify-center border-l border-[var(--surface-border-muted)]"
        >
          {rankQuery.isLoading ? (
            <Skeleton className="h-5 w-5" />
          ) : rankQuery.isError ? (
            <ShieldQuestion
              className="h-5 w-5 text-[rgb(var(--text-rgb)/0.45)]"
              aria-hidden="true"
            />
            ) : rankImageUrl ? (
              <img
                src={rankImageUrl}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                aria-hidden="true"
                decoding="async"
              />
            ) : (
              <Shield
                className="h-5 w-5"
                style={{ color: rank.color }}
                aria-hidden="true"
              />
          )}
        </span>
      </span>
    </button>
  );
}

export function RecentPlayerList({ accountIds, onOpen }: RecentPlayerListProps) {
  const steamQuery = useSteamProfiles(accountIds);

  if (accountIds.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-[rgb(var(--text-rgb)/0.5)]">
        RECENT PLAYERS
      </h2>
      <div className="panel w-full overflow-hidden">
        {accountIds.map((accountId) => (
          <RecentPlayerRow
            key={accountId}
            accountId={accountId}
            identityLoading={steamQuery.isLoading}
            profile={steamQuery.data?.[String(accountId)]}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
