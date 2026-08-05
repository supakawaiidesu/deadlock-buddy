import { PlayerIdentityPanel } from './player-identity-panel';
import { MatchActivityPanel } from './match-activity-panel';
import { PlayerWidgetLayout } from './player-widget-layout';

type PlayerProfileProps = {
  accountId: number;
};

export function PlayerProfile({ accountId }: PlayerProfileProps) {
  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      {/* The fixed activity track preserves square cells across the shared top row. */}
      <div className="grid min-w-0 grid-cols-1 gap-[4px] xl:grid-cols-[minmax(0,1fr)_minmax(0,378px)]">
        <PlayerIdentityPanel accountId={accountId} />
        <MatchActivityPanel accountId={accountId} />
      </div>
      <PlayerWidgetLayout accountId={accountId} />
    </div>
  );
}
