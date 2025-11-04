import { Panel } from '@/ui/panel';

export type HeroAverageStat = {
  label: string;
  value: string;
  hint?: string;
};

type HeroAverageStatsPanelProps = {
  title?: string;
  stats: readonly HeroAverageStat[];
};

export function HeroAverageStatsPanel({
  title = 'Average match performance',
  stats,
}: HeroAverageStatsPanelProps) {
  return (
    <Panel className="flex w-full flex-col gap-4 !p-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</h2>
        <span className="text-[9px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.4)]">
          Per-match averages
        </span>
      </div>
      <div className="flex flex-col overflow-hidden rounded-sm border border-[rgba(245,247,245,0.08)] bg-[rgba(8,8,10,0.9)] divide-y divide-[rgba(245,247,245,0.08)]">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(245,247,245,0.6)]">
                {stat.label}
              </span>
              <span className="text-sm text-[rgba(245,247,245,0.4)]">:</span>
              <span className="text-sm font-semibold text-[var(--accent)]">{stat.value}</span>
            </div>
            {stat.hint ? (
              <span className="text-[10px] uppercase tracking-[0.18em] text-[rgba(245,247,245,0.4)]">
                {stat.hint}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
