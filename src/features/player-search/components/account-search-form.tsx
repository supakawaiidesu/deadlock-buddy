import { ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { useSteamLookup } from '@/features/players/api/queries';
import { ApiError } from '@/lib/api/client';
import { hasSteamService } from '@/lib/api/steam';

type AccountSearchFormProps = {
  className?: string;
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

export function AccountSearchForm({ className, onResolved }: AccountSearchFormProps) {
  const lookupMutation = useSteamLookup();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isPending = lookupMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a Steam ID, profile URL, or name.');
      return;
    }
    if (!hasSteamService) {
      setError('Player lookup is unavailable.');
      return;
    }

    try {
      const profile = await lookupMutation.mutateAsync(trimmed);
      onResolved(profile.account_id);
    } catch (lookupError) {
      setError(resolveLookupError(lookupError));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={clsx('flex w-full flex-col gap-2', className)}>
      <div className="panel search-field flex h-12 min-w-0 w-full overflow-hidden">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[rgb(var(--text-rgb)/0.45)] transition-colors sm:px-4">
          <span className="sr-only">Search for a Steam player</span>
          <Search className="h-4 w-4 flex-none" aria-hidden="true" />
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder="steamid, profile url, or name"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgb(var(--text-rgb)/0.35)]"
            autoComplete="off"
            disabled={isPending}
          />
        </label>
        <button
          type="submit"
          className="panel-header-action h-12 shrink-0 -my-px disabled:cursor-wait disabled:opacity-70"
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
      {error ? (
        <p aria-live="polite" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
