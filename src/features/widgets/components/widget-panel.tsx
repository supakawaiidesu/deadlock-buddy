import { useState, type ReactNode } from 'react';
import { Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { Panel } from '@/ui/panel';

type WidgetPanelProps = {
  title: string;
  meta?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function WidgetPanel({
  title,
  meta,
  headerActions,
  className,
  children,
}: WidgetPanelProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  return (
    <Panel
      className={clsx('flex h-full min-w-0 flex-col gap-0 !p-0', className)}
    >
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          {title}
        </h2>
        <div className="panel-header-actions">
          {meta}
          <button
            type="button"
            onClick={() => setIsOptionsOpen((open) => !open)}
            aria-pressed={isOptionsOpen}
            aria-label={isOptionsOpen ? 'Close widget options' : 'Open widget options'}
            title={isOptionsOpen ? 'Close widget options' : 'Open widget options'}
            className={clsx(
              'panel-header-action',
              isOptionsOpen && 'bg-[var(--accent-muted)] text-[var(--accent)]',
            )}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
          {headerActions}
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {isOptionsOpen ? (
          <div className="absolute inset-0 z-10 flex flex-col items-start gap-3 bg-[var(--overlay-soft-background)] p-4">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--text-rgb)/0.5)]">
              Widget options
            </span>
            <p className="text-xs text-[rgb(var(--text-rgb)/0.6)]">
              Per-widget options are not available yet.
            </p>
            <button
              type="button"
              onClick={() => setIsOptionsOpen(false)}
              className="rounded-sm border border-[rgb(var(--text-rgb)/0.18)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.75)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              Close
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </Panel>
  );
}

export function WidgetMessage({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
      {children}
    </div>
  );
}
