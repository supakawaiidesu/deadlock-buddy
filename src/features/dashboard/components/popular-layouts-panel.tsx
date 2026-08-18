import { Link } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PopularShare } from '@/lib/api/schema';
import { Panel } from '@/ui/panel';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';

type PopularLayoutsPanelProps = {
  entries: readonly PopularShare[];
  headerActions?: ReactNode;
  size: WidgetRenderSize;
};

const CREATED_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function PopularLayoutsPanel({ entries, headerActions, size }: PopularLayoutsPanelProps) {
  const isCompact = size.width === null || size.width < 420;
  return (
    <Panel className="flex h-full flex-col gap-[4px] !p-0">
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          Popular layouts
        </h2>
        <div className="panel-header-actions">
          {isCompact ? null : <span className="panel-header-meta">Top {entries.length}</span>}
          {headerActions}
        </div>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 scroll-quiet">
        {entries.map((entry, index) => (
          <li key={entry.id} className="border-b border-[rgb(var(--text-rgb)/0.12)]">
            <Link
              to="/s/$shareSlug"
              params={{ shareSlug: `${entry.slug}-${entry.id}` }}
              className="flex items-center justify-between gap-4 px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.7)] transition hover:bg-[var(--surface-muted)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-[rgb(var(--text-rgb)/0.45)]">#{index + 1}</span>
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--text-strong)]">
                    {entry.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.5)]">
                    {CREATED_AT_FORMATTER.format(new Date(entry.createdAt))}
                  </span>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 font-semibold text-[var(--accent)]">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{entry.views.toLocaleString()}</span>
                <span className="sr-only">views</span>
              </span>
            </Link>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="px-4 py-3 text-xs text-[rgb(var(--text-rgb)/0.6)]">
            No popular layouts yet.
          </li>
        ) : null}
      </ol>
    </Panel>
  );
}
