import { clsx } from 'clsx';

type StatProps = {
  label: string;
  value: string;
  description?: string;
  accent?: boolean;
};

export function Stat({ label, value, description, accent = false }: StatProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-1 border border-[var(--surface-border-muted)] bg-[var(--surface-muted)] px-4 py-3',
        accent && 'border-[var(--surface-border)]',
      )}
    >
      <span className="text-xs font-medium uppercase tracking-[0.24em] text-[rgba(244,247,244,0.58)]">
        {label}
      </span>
      <span
        className={clsx(
          'text-2xl font-semibold text-white',
          accent && 'text-[var(--accent)]',
        )}
      >
        {value}
      </span>
      {description ? (
        <span className="text-sm text-[rgba(244,247,244,0.65)]">{description}</span>
      ) : null}
    </div>
  );
}
