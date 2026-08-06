import { useState } from 'react';
import { clsx } from 'clsx';
import type { PlayerSteamSearchResult } from '@/lib/api/schema';
import { truncateRecentPlayerName } from '@/features/player-search/lib/recent-player-display';

type PlayerSearchResultsProps = {
  results: readonly PlayerSteamSearchResult[];
  highlightedIndex: number;
  idPrefix: string;
  className?: string;
  onSelect: (result: PlayerSteamSearchResult) => void;
  onHighlight: (index: number) => void;
};

type PlayerSearchAvatarProps = {
  avatarUrl: string;
  displayName: string;
};

function PlayerSearchAvatar({ avatarUrl, displayName }: PlayerSearchAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = avatarUrl.length > 0 && failedUrl !== avatarUrl;

  return (
    <span className="relative h-16 w-16 shrink-0 self-stretch overflow-hidden border-r border-[var(--surface-border-muted)]">
      {showImage ? (
        <img
          src={avatarUrl}
          alt={`${displayName} Steam avatar`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span className="absolute inset-0 bg-[var(--surface-muted)]" aria-hidden="true" />
      )}
    </span>
  );
}

export function PlayerSearchResults({
  results,
  highlightedIndex,
  idPrefix,
  className,
  onSelect,
  onHighlight,
}: PlayerSearchResultsProps) {
  return (
    <div
      role="listbox"
      className={clsx('panel overflow-y-auto scroll-quiet', className)}
      aria-label="Steam player search results"
    >
      {results.map((result, index) => {
        const displayName = result.personaname.trim() || String(result.account_id);
        const optionId = `${idPrefix}-option-${result.account_id}-${index}`;
        const isHighlighted = highlightedIndex === index;

        return (
          <button
            key={`${idPrefix}-${result.account_id}-${index}`}
            id={optionId}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            aria-label={`Open player ${displayName}, Account ID ${result.account_id}`}
            className={clsx(
              'panel-header-interactive flex h-16 w-full min-w-0 items-stretch border-b border-[var(--surface-border-muted)] text-left last:border-b-0',
              isHighlighted && 'bg-[var(--accent-muted)] text-[var(--accent)]',
            )}
            onPointerDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onSelect(result)}
          >
            <PlayerSearchAvatar avatarUrl={result.avatarmedium} displayName={displayName} />
            <span className="flex min-w-0 flex-1 items-stretch">
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
                <span
                  className="truncate text-sm font-semibold text-[var(--text-strong)]"
                  title={displayName}
                >
                  {truncateRecentPlayerName(displayName)}
                </span>
                <span className="min-w-0 truncate text-xs text-[rgb(var(--text-rgb)/0.55)]">
                  Account ID {result.account_id}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
