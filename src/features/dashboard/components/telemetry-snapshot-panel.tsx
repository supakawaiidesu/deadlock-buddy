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
    <Panel ref={outerRef} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Telemetry snapshot
        </h2>
        {headerActions}
      </div>
      <ul className="space-y-2 text-xs text-[rgba(245,247,245,0.65)]">
        <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2">
          <span>Leaderboard sample</span>
          <span className="font-semibold text-white">{leaderboardSampleSize || '—'}</span>
        </li>
        <li className="flex items-center justify-between border-b border-[var(--surface-border-muted)] pb-2">
          <span>Hero roster tracked</span>
          <span className="font-semibold text-white">{heroCount}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Highest badge · sample</span>
          <span className="font-semibold text-[var(--accent)]">{highestBadge || '—'}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Top winrate · sample</span>
          <span className="font-semibold text-[var(--accent)]">
            {formatPercent(topWinrate)}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span>Data refresh</span>
          <span className="font-semibold text-[rgba(245,247,245,0.55)]">~60 seconds</span>
        </li>
      </ul>
    </Panel>
  );
}
