import type { ReactNode } from 'react';
import { Panel } from '@/ui/panel';
import type { HeroLeaderboardEntry } from '@/features/heroes/components/hero-leaderboard-panel';

type TelemetrySnapshotPanelProps = {
  leaderboardSampleSize: number;
  heroCount: number;
  highestBadge: number;
  heroWinrateEntries: readonly HeroLeaderboardEntry[];
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

function formatPercent(value?: number): string {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 1000) / 10}%`;
}

export function TelemetrySnapshotPanel({
  leaderboardSampleSize,
  heroCount,
  highestBadge,
  heroWinrateEntries,
  headerActions,
  outerRef,
}: TelemetrySnapshotPanelProps) {
  const topWinrate = heroWinrateEntries[0]?.value;

  return (
    <Panel ref={outerRef} className="flex h-full flex-col gap-[2px] !p-0">
      <div className="flex items-center justify-between border-b border-[var(--surface-border-muted)] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Telemetry snapshot</h2>
        <div className="flex items-center">{headerActions}</div>
      </div>
      <ul className="flex flex-1 flex-col gap-[6px] px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
        <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2 leading-tight">
          <span>Leaderboard sample</span>
          <span className="font-semibold text-white">{leaderboardSampleSize || '—'}</span>
        </li>
        <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2 leading-tight">
          <span>Hero roster tracked</span>
          <span className="font-semibold text-white">{heroCount}</span>
        </li>
        <li className="flex items-center justify-between leading-tight">
          <span>Highest badge · sample</span>
          <span className="font-semibold text-[var(--accent)]">{highestBadge || '—'}</span>
        </li>
        <li className="flex items-center justify-between leading-tight">
          <span>Top winrate · sample</span>
          <span className="font-semibold text-[var(--accent)]">
            {formatPercent(topWinrate)}
          </span>
        </li>
        <li className="flex items-center justify-between leading-tight">
          <span>Data refresh</span>
          <span className="font-semibold text-[rgba(245,247,245,0.55)]">~60 seconds</span>
        </li>
      </ul>
    </Panel>
  );
}
