import { useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { clsx } from 'clsx';

type AccountSearchFormProps = {
  className?: string;
};

export function AccountSearchForm({ className }: AccountSearchFormProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = value.trim();
    const numericId = Number.parseInt(trimmed, 10);

    if (!trimmed || Number.isNaN(numericId) || numericId <= 0) {
      setError('Enter a valid account ID.');
      return;
    }

    navigate({ to: '/players/$accountId', params: { accountId: String(numericId) } });
  };

  return (
    <form onSubmit={handleSubmit} className={clsx('flex w-full max-w-xl flex-col gap-4', className)}>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[rgb(var(--text-rgb)/0.7)]">Deadlock account ID</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="border border-[var(--surface-border-muted)] bg-[var(--surface-muted)] px-4 py-3 text-lg text-[var(--text-strong)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] focus:ring-offset-0"
          placeholder="e.g. 342189169"
          autoComplete="off"
          inputMode="numeric"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
      >
        View player
      </button>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </form>
  );
}
