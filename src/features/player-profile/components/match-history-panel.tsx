import { useMemo, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { LoaderCircle } from 'lucide-react';
import {
  usePlayerMatchHistoryFeed,
  usePlayerSteamProfiles,
} from '@/features/players/api/queries';
import { MATCH_METADATA_PAGE_SIZE } from '@/lib/api/matches';
import { getHeroDisplayName, getHeroIconUrl } from '@/lib/data/heroes';
import { getItemDisplayName, getItemIconUrl } from '@/lib/data/items';
import {
  formatCompactNumber,
  formatMinutes,
  formatNumber,
  formatPercent,
} from '@/lib/utils/format';
import { WidgetPanel } from '@/features/widgets/components/widget-panel';
import { Skeleton } from '@/ui/skeleton';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';
import { getWidgetWidthMode, type WidgetWidthMode } from '@/features/widgets/widget-responsive';
import type {
  MatchHistoryMetricTone,
  MatchHistoryOutcome,
  MatchHistoryRow,
  MatchHistoryTeam,
} from '../lib/match-history';
import {
  buildMatchHistoryRows,
  getCreepScorePerMinuteTone,
  getKdaTone,
} from '../lib/match-history';

const MATCH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const OUTCOME_STYLES: Record<MatchHistoryOutcome, string> = {
  win: 'text-[var(--accent)]',
  loss: 'text-[var(--danger)]',
  unknown: 'text-[rgb(var(--text-rgb)/0.55)]',
};

const OUTCOME_LABELS: Record<MatchHistoryOutcome, string> = {
  win: 'Victory',
  loss: 'Defeat',
  unknown: 'Unknown',
};
const METRIC_TONE_CLASSES: Record<MatchHistoryMetricTone, string> = {
  neutral: 'text-[rgb(var(--text-rgb)/0.5)]',
  negative: 'text-[var(--danger)]',
  average: 'text-[var(--info)]',
  positive: 'text-[var(--accent)]',
  amazing: 'text-[var(--success)]',
};

type Props = {
  accountId: number;
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};
export function MatchHistoryPanel({ accountId, headerActions, size }: Props) {
  const feed = usePlayerMatchHistoryFeed(accountId);
  const accountIds = useMemo(
    () =>
      Array.from(
        new Set(
          feed.metadata.flatMap((match) => match.players.map((player) => player.account_id)),
        ),
      ).sort((a, b) => a - b),
    [feed.metadata],
  );
  const steamProfilesQuery = usePlayerSteamProfiles(accountIds);
  const steamProfiles = steamProfilesQuery.data ?? {};
  const rows = useMemo(
    () => buildMatchHistoryRows(feed.visibleMatches, feed.metadata, accountId, steamProfiles),
    [accountId, feed.metadata, feed.visibleMatches, steamProfiles],
  );

  const metadataPageCount = feed.metadataQuery.data?.pages.length ?? 0;
  const canRetryInitialDetails = feed.metadataQuery.isError && metadataPageCount === 0;
  const showLoadAction = feed.hasMore || feed.metadataQuery.isError;
  const remainingMatches = Math.max(feed.matches.length - feed.visibleMatches.length, 0);
  const widthMode = getWidgetWidthMode(size.width, 640, 1000);

  function handleLoadAction() {
    if (canRetryInitialDetails) {
      void feed.metadataQuery.refetch();
      return;
    }

    void feed.metadataQuery.fetchNextPage();
  }

  return (
    <WidgetPanel
      title="Match history"
      meta={<span className="panel-header-meta">{rows.length} matches</span>}
      headerActions={headerActions}
      size={size}
    >
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto scroll-quiet">
        {feed.isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--surface-border-muted)]">
            {[0, 1, 2].map((index) => (
              <MatchHistoryRowSkeleton key={index} widthMode={widthMode} />
            ))}
          </div>
        ) : feed.historyQuery.isError ? (
          <div className="px-4 py-8 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
            Match history is unavailable right now. Try again later.
          </div>
        ) : feed.matches.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
            No matches found for this player.
          </div>
        ) : (
          <>
            {feed.metadataQuery.isError ? (
              <div className="border-b border-[var(--surface-border-muted)] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--text-rgb)/0.55)]">
                Some enriched match details are unavailable. Basic history remains visible.
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col divide-y divide-[var(--surface-border-muted)]">
              {rows.map((row) => (
                <MatchHistoryRowView key={row.matchId} row={row} widthMode={widthMode} />
              ))}
            </div>
            {showLoadAction ? (
              <button
                type="button"
                onClick={handleLoadAction}
                disabled={feed.metadataQuery.isFetchingNextPage || feed.metadataQuery.isLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-[var(--surface-border-muted)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-rgb)/0.65)] transition hover:bg-[rgb(var(--text-rgb)/0.05)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
              >
                {feed.metadataQuery.isFetchingNextPage || feed.metadataQuery.isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                <span>
                  {canRetryInitialDetails
                    ? 'Retry match details'
                    : `Load ${Math.min(MATCH_METADATA_PAGE_SIZE, remainingMatches)} more matches`}
                </span>
              </button>
            ) : null}
          </>
        )}
      </div>
    </WidgetPanel>
  );
}

function MatchHistoryRowSkeleton({ widthMode }: { widthMode: WidgetWidthMode }) {
  return (
    <div className={clsx(
      'grid min-w-0 gap-4 px-3 py-4',
      widthMode === 'compact' && 'grid-cols-1',
      widthMode === 'standard' && 'grid-cols-[48px_minmax(0,1fr)_minmax(190px,auto)]',
      widthMode === 'wide' && 'grid-cols-[48px_minmax(360px,1.2fr)_minmax(190px,0.8fr)_minmax(250px,1.1fr)]',
    )}>
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function MatchHistoryRowView({ row, widthMode }: { row: MatchHistoryRow; widthMode: WidgetWidthMode }) {
  const heroName = row.heroId === null ? 'Unknown hero' : getHeroDisplayName(row.heroId);
  const heroIconUrl = row.heroId === null ? null : getHeroIconUrl(row.heroId);
  const dateLabel =
    row.startTime > 0
      ? MATCH_DATE_FORMATTER.format(new Date(row.startTime * 1000))
      : 'Unknown date';

  return (
    <article className="min-w-0">
      <div className="flex min-h-7 min-w-0 items-center justify-between gap-3 border-b border-[var(--surface-border-muted)] px-3 py-1.5 text-[9px] uppercase tracking-[0.1em]">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[rgb(var(--text-rgb)/0.55)]">
          <span className={clsx('shrink-0 font-semibold', OUTCOME_STYLES[row.outcome])}>
            {OUTCOME_LABELS[row.outcome]}
          </span>
          <span className="min-w-0 truncate font-semibold text-[var(--text-strong)]" title={row.modeLabel}>
            {row.modeLabel}
          </span>
          <span className="shrink-0">{dateLabel}</span>
          <span className="shrink-0">{formatMinutes(row.durationSeconds)}</span>
        </div>
        <span className="shrink-0 text-[rgb(var(--text-rgb)/0.38)]">#{row.matchId}</span>
      </div>

      <div className={clsx(
        'grid min-w-0 items-center gap-x-3 gap-y-2 px-3 py-2',
        widthMode === 'compact' && 'grid-cols-[48px_minmax(0,1fr)]',
        widthMode === 'standard' && 'grid-cols-[48px_minmax(0,1fr)_minmax(190px,auto)]',
        widthMode === 'wide' && 'grid-cols-[48px_minmax(360px,1.2fr)_minmax(190px,0.8fr)_minmax(250px,1.1fr)]',
      )}>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center bg-[rgb(var(--neutral-rgb)/0.08)]"
          role="img"
          aria-label={heroName}
        >
          {heroIconUrl ? (
            <img
              src={heroIconUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
          ) : (
            <span className="text-lg text-[rgb(var(--text-rgb)/0.35)]">?</span>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-x-3">
          <Metric
            ariaLabel="Kills, deaths, and assists"
            value={
              <>
                {formatNumber(row.stats.kills)} /{' '}
                <span className="text-[var(--danger)]">{formatNumber(row.stats.deaths)}</span> /{' '}
                {formatNumber(row.stats.assists)}
              </>
            }
            detail={`${row.stats.kdaRatio.toFixed(2)} KDA`}
            detailClassName={METRIC_TONE_CLASSES[getKdaTone(row.stats.kdaRatio)]}
          />
          <Metric
            ariaLabel="Creep score, souls, and creep score per minute"
            value={
              <>
                {formatNumber(row.stats.creepKills)} CS{' '}
                <span className="text-[#9affd6]">({formatCompactNumber(row.stats.souls)})</span>
              </>
            }
            detail={`${row.stats.creepKillsPerMinute.toFixed(1)} CS/min`}
            detailClassName={METRIC_TONE_CLASSES[
              getCreepScorePerMinuteTone(row.modeLabel, row.stats.creepKillsPerMinute)
            ]}
          />
          <Metric
            className="text-right"
            ariaLabel="Kill participation and headshot rate"
            value={`${formatPercent(row.stats.killParticipation)} KP`}
            detail={`${formatPercent(row.stats.headshotRate)} headshots`}
          />
        </div>

        <FinalBuild itemIds={row.finalBuildItemIds} widthMode={widthMode} />

        <div className={clsx(
          'flex min-h-[5.75rem] min-w-0 self-stretch items-center border-[var(--surface-border-muted)] px-3 py-2',
          widthMode === 'compact' && 'col-span-2 -mx-3 border-t',
          widthMode === 'standard' && 'col-span-3 -mx-3 border-t',
          widthMode === 'wide' && '-my-2 border-l pl-3',
        )}>
          {row.teams.length > 0 ? (
            <div className="grid w-full min-w-0 grid-cols-2 items-center gap-x-1">
              {row.teams.slice(0, 2).map((team) => (
                <TeamList key={team.id} team={team} />
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-[rgb(var(--text-rgb)/0.45)]">Team roster unavailable.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({
  ariaLabel,
  value,
  detail,
  className,
  detailClassName,
}: {
  ariaLabel: string;
  value: ReactNode;
  detail: ReactNode;
  className?: string;
  detailClassName?: string;
}) {
  return (
    <div className={clsx('min-w-0', className)} title={ariaLabel} aria-label={ariaLabel}>
      <div className="truncate text-[12px] font-semibold leading-tight text-[var(--text-strong)]">
        {value}
      </div>
      <div
        className={clsx(
          'mt-0.5 truncate text-[10px] leading-tight',
          detailClassName ?? 'text-[rgb(var(--text-rgb)/0.5)]',
        )}
      >
        {detail}
      </div>
    </div>
  );
}

function FinalBuild({
  itemIds,
  widthMode,
}: {
  itemIds: readonly number[];
  widthMode: WidgetWidthMode;
}) {
  const visibleItemIds = itemIds.slice(-6);
  return (
    <div className={clsx(
      'flex min-w-0 items-center',
      widthMode === 'compact' ? 'col-span-2 justify-center' : 'justify-end',
    )}>
      <span className="sr-only">Final build</span>
      {visibleItemIds.length > 0 ? (
        <div className="grid grid-cols-6 gap-1" aria-label={`${visibleItemIds.length} final items`}>
          {visibleItemIds.map((itemId) => {
            const iconUrl = getItemIconUrl(itemId);
            if (!iconUrl) return null;

            const itemName = getItemDisplayName(itemId);
            return (
              <img
                key={itemId}
                src={iconUrl}
                alt={itemName}
                title={itemName}
                width={28}
                height={28}
                className="h-7 w-7 bg-[rgb(var(--neutral-rgb)/0.08)] object-cover"
              />
            );
          })}
        </div>
      ) : (
        <span className="text-[10px] text-[rgb(var(--text-rgb)/0.45)]">—</span>
      )}
    </div>
  );
}

function TeamList({ team }: { team: MatchHistoryTeam }) {
  return (
    <ul aria-label={team.id} className="flex min-w-0 flex-col gap-0.5">
      {team.players.slice(0, 6).map((player) => {
        const heroIconUrl = player.heroId === null ? null : getHeroIconUrl(player.heroId);
        return (
          <li
            key={player.accountId}
            className="flex min-w-0 items-center gap-1.5 text-[10px] leading-[1.1] text-[rgb(var(--text-rgb)/0.7)]"
          >
            {heroIconUrl ? (
              <img
                src={heroIconUrl}
                alt=""
                width={14}
                height={14}
                className="h-3.5 w-3.5 shrink-0 object-cover"
              />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 bg-[rgb(var(--neutral-rgb)/0.08)]" aria-hidden="true" />
            )}
            <span
              className={clsx(
                'truncate',
                player.isCurrentPlayer && 'font-semibold text-[var(--text-strong)]',
              )}
              title={player.personaName}
            >
              {player.personaName}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
