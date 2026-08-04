import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerMatchHistory } from '@/features/players/api/queries';
import { formatPercent } from '@/lib/utils/format';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import { aggregateDailyActivity, type DayActivity } from '../lib/match-activity';

type Props = {
  accountId: number;
};

const DAYS = 30;
/** Gap between the hovered cell and the tooltip, and the viewport safety margin. */
const TOOLTIP_OFFSET = 6;
const VIEWPORT_MARGIN = 8;

/**
 * Win-rate colour ramp for a day cell.
 *
 * Diverging rather than sequential: the colour has to read as "won more" or
 * "lost more" at a glance, with saturation carrying how lopsided the day was.
 * Idle days sit just above the panel surface so the grid reads as a calendar.
 */
function dayCellColor(day: DayActivity): string {
  if (day.total === 0) return 'rgb(var(--text-rgb)/0.06)';
  if (day.winRate >= 0.65) return 'rgb(var(--accent-rgb)/0.95)';
  if (day.winRate >= 0.5) return 'rgb(var(--accent-rgb)/0.45)';
  if (day.winRate >= 0.35) return 'rgb(248 113 113 / 0.45)';

  return 'rgb(248 113 113 / 0.9)';
}

type HoverState = {
  day: DayActivity;
  /** Viewport rect of the hovered cell, in `fixed` coordinate space. */
  rect: DOMRect;
};

export function MatchActivityPanel({ accountId }: Props) {
  const historyQuery = usePlayerMatchHistory(accountId);
  const [hover, setHover] = useState<HoverState | null>(null);
  const days = historyQuery.data ? aggregateDailyActivity(historyQuery.data, DAYS) : null;

  return (
    <Panel className="flex h-full flex-col !p-0">
      {historyQuery.isLoading || !days ? (
        <Skeleton className="h-full min-h-[112px] w-full" />
      ) : (
        /* Cells share edges: no gap, no padding — the grid itself is the panel. */
        <div className="grid flex-1 grid-cols-10">
          {days.map((day) => (
            <div
              key={day.date}
              className="aspect-square w-full"
              style={{ backgroundColor: dayCellColor(day) }}
              onMouseEnter={(event) =>
                setHover({ day, rect: event.currentTarget.getBoundingClientRect() })
              }
              onMouseLeave={() =>
                setHover((current) => (current?.day.date === day.date ? null : current))
              }
            />
          ))}
        </div>
      )}

      {hover ? <DayTooltip day={hover.day} anchor={hover.rect} /> : null}
    </Panel>
  );
}

/**
 * Hover card for a single day.
 *
 * Portaled to `document.body` with `fixed` coordinates: the panel sits inside
 * `AppShell`'s `overflow-y-auto` main element, which clips absolutely positioned
 * children, so an in-panel tooltip loses its top edge on every row but the first.
 * Escaping the scroll container is the only way to let it overhang the panel.
 */
function DayTooltip({ day, anchor }: { day: DayActivity; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const { width, height } = node.getBoundingClientRect();
    const above = anchor.top - height - TOOLTIP_OFFSET;
    // Flip below only when the card genuinely will not fit above the cell.
    const top = above >= VIEWPORT_MARGIN ? above : anchor.bottom + TOOLTIP_OFFSET;
    const centered = anchor.left + anchor.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(centered, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));

    setPlacement({ top, left });
  }, [anchor]);

  const date = new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const hours = Math.floor(day.durationSeconds / 3600);
  const minutes = Math.round((day.durationSeconds % 3600) / 60);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[80] w-max whitespace-nowrap border border-[var(--surface-border-muted)] bg-[var(--overlay-background)] px-2.5 py-2 text-[11px] leading-relaxed shadow-lg shadow-[rgb(var(--shadow-rgb)/0.45)]"
      style={{
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        // Avoid a first-paint flash at 0,0 before the measure pass lands.
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      <span className="block font-semibold text-[var(--text-strong)]">{date}</span>
      {day.total === 0 ? (
        <span className="block text-[rgb(var(--text-rgb)/0.5)]">No matches</span>
      ) : (
        <>
          <span className="block text-[rgb(var(--text-rgb)/0.7)]">
            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} played
          </span>
          <span className="block text-[rgb(var(--text-rgb)/0.7)]">
            <span className="text-[var(--accent)]">{day.wins}W</span>
            {' \u00B7 '}
            <span className="text-[var(--danger)]">{day.losses}L</span>
            {' \u00B7 '}
            {formatPercent(day.winRate)}
          </span>
        </>
      )}
    </div>,
    document.body,
  );
}
