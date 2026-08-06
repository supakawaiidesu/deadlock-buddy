import { ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { usePlayerSearch, useSteamLookup } from '@/features/players/api/queries';
import { ApiError } from '@/lib/api/client';
import { hasSteamService } from '@/lib/api/steam';
import type { PlayerSteamSearchResult } from '@/lib/api/schema';
import { PlayerSearchResults } from '@/features/player-search/components/player-search-results';

const DEFAULT_PLACEHOLDER = 'steamid, profile url, or name';
export const PLAYER_SEARCH_DEBOUNCE_MS = 500;

type AccountSearchFormProps = {
  className?: string;
  placeholder?: string;
  variant?: 'panel' | 'header';
  onResolved: (accountId: number) => void;
};

function resolveLookupError(error: unknown): string {
  if (!hasSteamService) {
    return 'Player lookup is unavailable.';
  }

  if (error instanceof ApiError) {
    if (error.status === 404) return 'No Steam profile found.';
    if (error.status === 429) return 'Too many lookups. Try again shortly.';
  }

  return 'Unable to look up that player. Try again.';
}

function resolveSearchError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many searches. Try again shortly.';
  }

  return 'Unable to search players. Try again.';
}

export function AccountSearchForm({
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  variant = 'panel',
  onResolved,
}: AccountSearchFormProps) {
  const lookupMutation = useSteamLookup();
  const searchQueryId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const [value, setValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const isPending = lookupMutation.isPending;
  const trimmedValue = value.trim();
  const playerSearch = usePlayerSearch(debouncedQuery);
  const isSearchQueryCurrent =
    trimmedValue.length > 0 && trimmedValue === debouncedQuery;
  const searchResults =
    isSearchQueryCurrent && playerSearch.isSuccess ? (playerSearch.data ?? []) : [];
  const searchStateIsActive =
    isSearchQueryCurrent &&
    (playerSearch.isLoading || playerSearch.isSuccess || playerSearch.isError);
  const isOverlayVisible =
    isFocused && isOverlayOpen && (Boolean(error) || searchStateIsActive);
  const listboxId = `${searchQueryId}-player-search-results`;
  const optionIdPrefix = `${searchQueryId}-option`;
  const activeOptionId =
    isOverlayVisible && highlightedIndex >= 0 && highlightedIndex < searchResults.length
      ? `${optionIdPrefix}-${searchResults[highlightedIndex]?.account_id}-${highlightedIndex}`
      : undefined;
  const searchStatus =
    error ??
    (isSearchQueryCurrent && playerSearch.isLoading
      ? 'Searching players…'
      : isSearchQueryCurrent && playerSearch.isError
        ? resolveSearchError(playerSearch.error)
        : isSearchQueryCurrent && playerSearch.isSuccess && searchResults.length === 0
          ? 'No matching Steam players.'
          : null);

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isFocused && (error || searchStateIsActive)) {
      setIsOverlayOpen(true);
    }
  }, [error, isFocused, searchStateIsActive]);

  useEffect(() => {
    if (highlightedIndex >= searchResults.length) {
      setHighlightedIndex(-1);
    }
  }, [highlightedIndex, searchResults.length]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && formRef.current?.contains(target)) return;

      setIsFocused(false);
      setIsOverlayOpen(false);
      setHighlightedIndex(-1);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isFocused]);

  const clearDebounceTimer = () => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextQuery = nextValue.trim();

    clearDebounceTimer();
    setValue(nextValue);
    setDebouncedQuery('');
    setHighlightedIndex(-1);
    setIsOverlayOpen(false);
    if (error) setError(null);

    if (nextQuery) {
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        setDebouncedQuery(nextQuery);
      }, PLAYER_SEARCH_DEBOUNCE_MS);
    }
  };

  const closeOverlay = () => {
    setIsOverlayOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelect = (result: PlayerSteamSearchResult) => {
    clearDebounceTimer();
    setValue('');
    setDebouncedQuery('');
    setError(null);
    closeOverlay();
    onResolved(result.account_id);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    closeOverlay();
    clearDebounceTimer();
    setDebouncedQuery('');
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a Steam ID, profile URL, or name.');
      setIsOverlayOpen(true);
      return;
    }
    if (!hasSteamService) {
      setError('Player lookup is unavailable.');
      setIsOverlayOpen(true);
      return;
    }

    try {
      const profile = await lookupMutation.mutateAsync(trimmed);
      clearDebounceTimer();
      setValue('');
      setDebouncedQuery('');
      setError(null);
      closeOverlay();
      onResolved(profile.account_id);
    } catch (lookupError) {
      setError(resolveLookupError(lookupError));
      setIsOverlayOpen(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
      return;
    }

    if (event.key === 'Tab') {
      closeOverlay();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!isOverlayVisible || searchResults.length === 0) return;

      event.preventDefault();
      setHighlightedIndex((currentIndex) => {
        if (event.key === 'ArrowDown') {
          return currentIndex >= searchResults.length - 1 ? 0 : currentIndex + 1;
        }
        return currentIndex <= 0 ? searchResults.length - 1 : currentIndex - 1;
      });
      return;
    }

    if (
      event.key === 'Enter' &&
      isOverlayVisible &&
      highlightedIndex >= 0 &&
      highlightedIndex < searchResults.length
    ) {
      event.preventDefault();
      const result = searchResults[highlightedIndex];
      if (result) handleSelect(result);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
    if (event.relatedTarget && formRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }

    setIsFocused(false);
    closeOverlay();
  };

  const overlayPositionClassName =
    variant === 'panel'
      ? 'absolute left-0 right-0 top-[calc(100%+4px)] z-[80]'
      : 'fixed left-[4px] right-[4px] top-[56px] z-[80] md:absolute md:left-0 md:right-0 md:top-[calc(100%+4px)]';
  const overlayMaxHeightClassName =
    variant === 'panel'
      ? 'max-h-[min(28rem,calc(50dvh-1rem))]'
      : 'max-h-[calc(100dvh-60px)]';

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={handleBlur}
      className={clsx(
        'relative',
        variant === 'panel' ? 'flex w-full flex-col gap-2' : 'min-w-0',
        className,
      )}
    >
      <div
        className={clsx(
          'search-field flex min-w-0 w-full overflow-hidden',
          variant === 'panel' ? 'panel h-12' : 'h-full self-stretch',
        )}
      >
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[rgb(var(--text-rgb)/0.45)] transition-colors sm:px-4">
          <span className="sr-only">Search for a Steam player</span>
          <Search className="h-4 w-4 flex-none" aria-hidden="true" />
          <input
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOverlayVisible}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            className={clsx(
              'min-w-0 flex-1 border-0 bg-transparent text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgb(var(--text-rgb)/0.35)]',
              variant === 'panel' ? 'text-sm' : 'text-xs sm:text-sm',
            )}
            autoComplete="off"
            disabled={isPending}
          />
        </label>
        <button
          type="submit"
          className={clsx(
            'panel-header-action shrink-0 disabled:cursor-wait disabled:opacity-70',
            variant === 'panel' && 'h-12 -my-px',
          )}
          aria-label="Search for player"
          title="Search for player"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {isOverlayVisible ? (
        <div className={overlayPositionClassName}>
          {error ? (
            <div
              id={listboxId}
              role="status"
              aria-live="polite"
              className="panel flex min-h-16 items-center px-4 py-3 text-sm text-[var(--danger)]"
            >
              {searchStatus}
            </div>
          ) : searchResults.length > 0 ? (
            <PlayerSearchResults
              results={searchResults}
              highlightedIndex={highlightedIndex}
              idPrefix={optionIdPrefix}
              className={overlayMaxHeightClassName}
              onSelect={handleSelect}
              onHighlight={setHighlightedIndex}
            />
          ) : (
            <div
              id={listboxId}
              role="status"
              aria-live="polite"
              className="panel flex min-h-16 items-center px-4 py-3 text-sm text-[rgb(var(--text-rgb)/0.68)]"
            >
              {searchStatus}
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
