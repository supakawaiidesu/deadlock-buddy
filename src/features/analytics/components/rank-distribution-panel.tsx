import { useMemo, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { Filter } from 'lucide-react';
import { Panel } from '@/ui/panel';
import type { BadgeDistributionEntry } from '@/lib/api/schema';
import { buildTierLabel, TIER_COLORS } from '@/lib/data/ranks';

type RankDistributionPanelProps = {
  entries: readonly BadgeDistributionEntry[];
  minUnixTimestamp?: number;
  headerActions?: ReactNode;
};


type ChartDatum = {
  rank: number;
  players: number;
  /** Share of players at this badge or higher. */
  topPercent: number;
  tierName: string;
  tierLabel: string;
  color: string;
  /** Middle bar of a contiguous tier band — sole x-axis label for that tier. */
  showTierTick: boolean;
};

function formatTopPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Top <0.01%';
  if (value >= 99.95) return 'Top 100%';
  if (value >= 10) return `Top ${value.toFixed(1)}%`;
  return `Top ${value.toFixed(2)}%`;
}

function formatTimeBadge(timestamp?: number) {
  if (!timestamp) return '7 Days';
  try {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
    if (diffDays <= 7) {
      const days = diffDays === 0 ? 1 : diffDays;
      return `${days} Day${days === 1 ? '' : 's'}`;
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.warn('Failed to format rank distribution date', error);
    return 'Recent';
  }
}

function RankDistributionTooltip(props: TooltipContentProps<number, string>) {
  const { active, payload } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as ChartDatum | undefined;
  if (!datum) return null;

  return (
    <div className="rounded-sm border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] px-3 py-2 text-xs text-[rgb(var(--text-rgb)/0.75)] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-6">
        <span className="font-semibold text-[var(--text-strong)]">{datum.tierLabel}</span>
        <span className="font-semibold" style={{ color: datum.color }}>
          {formatTopPercent(datum.topPercent)}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text-rgb)/0.45)]">
        {datum.players.toLocaleString()} players
      </div>
    </div>
  );

}

/** Mark the middle bar of each contiguous same-tier run for one label per tier. */
function withTierAxisTicks(data: Omit<ChartDatum, 'showTierTick'>[]): ChartDatum[] {
  if (data.length === 0) return [];

  const result: ChartDatum[] = data.map((entry) => ({ ...entry, showTierTick: false }));
  let bandStart = 0;

  for (let index = 1; index <= result.length; index += 1) {
    const bandEnded =
      index === result.length || result[index]?.tierName !== result[bandStart]?.tierName;
    if (!bandEnded) continue;

    const mid = bandStart + Math.floor((index - 1 - bandStart) / 2);
    const midEntry = result[mid];
    if (midEntry) midEntry.showTierTick = true;
    bandStart = index;
  }

  return result;
}

export function RankDistributionPanel({
  entries,
  minUnixTimestamp,
  headerActions,
}: RankDistributionPanelProps) {
  const totalPlayers = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.unique_players ?? 0), 0),
    [entries],
  );

  const chartData: ChartDatum[] = useMemo(() => {
    if (totalPlayers <= 0) return [];

    const mapped = [...entries]
      .filter(
        (entry) =>
          typeof entry.badge_level === 'number' && typeof entry.unique_players === 'number',
      )
      .sort((a, b) => a.badge_level - b.badge_level)
      .map((entry) => {
        const { tierName, label } = buildTierLabel(entry.badge_level);
        return {
          rank: entry.badge_level,
          players: entry.unique_players,
          topPercent: 0,
          tierName,
          tierLabel: label,
          color: TIER_COLORS[tierName] ?? TIER_COLORS.Unclassified,
        };
      });

    // Cumulative from the high end: top% = players at this badge or higher.
    let playersAtOrAbove = 0;
    for (let index = mapped.length - 1; index >= 0; index -= 1) {
      const entry = mapped[index];
      if (!entry) continue;
      playersAtOrAbove += entry.players;
      entry.topPercent = (playersAtOrAbove / totalPlayers) * 100;
    }

    return withTierAxisTicks(mapped);
  }, [entries, totalPlayers]);


  const timeLabel = useMemo(() => formatTimeBadge(minUnixTimestamp), [minUnixTimestamp]);
  const playersLabel = useMemo(
    () => `${totalPlayers.toLocaleString()} Players`,
    [totalPlayers],
  );

  return (
    <Panel className="flex h-full flex-col gap-[4px] !p-0">
      <div className="panel-header">
        <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-strong)]">
          Rank distribution histogram
        </h2>
        <div className="panel-header-actions">
          <span className="panel-header-meta">{timeLabel}</span>
          <span className="panel-header-meta">{playersLabel}</span>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('rank-distribution:open-filters'))
            }
            className="panel-header-action"
            aria-label="Open filters"
            title="Open filters"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
          {headerActions}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-0">
        {chartData.length === 0 ? (
          <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.12)] bg-[rgb(var(--text-rgb)/0.02)] px-4 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
            Distribution data unavailable. Try again later.
          </div>
        ) : (
          <div className="min-h-[180px] w-full flex-1">
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="focus:outline-none focus-visible:outline-none"
            >
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 10, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgb(var(--text-rgb)/0.08)"
                />
                <XAxis
                  dataKey="rank"
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--text-rgb)/0.12)' }}
                  stroke="rgb(var(--text-rgb)/0.45)"
                  height={28}
                  tick={({ x, y, payload }) => {
                    const datum = chartData.find((entry) => entry.rank === payload.value);
                    if (!datum?.showTierTick) return <g />;

                    return (
                      <text
                        x={x}
                        y={y}
                        dy={12}
                        textAnchor="middle"
                        fill="rgb(var(--text-rgb)/0.55)"
                        fontSize={10}
                      >
                        {datum.tierName}
                      </text>
                    );
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--text-rgb)/0.12)' }}
                  stroke="rgb(var(--text-rgb)/0.45)"
                  tick={{ fontSize: 10 }}
                  width={38}
                />
                <Tooltip
                  cursor={{ fill: 'rgb(var(--accent-rgb)/0.12)' }}
                  content={RankDistributionTooltip}
                />
                <Bar
                  dataKey="players"
                  radius={[2, 2, 0, 0]}
                  minPointSize={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.rank} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Panel>
  );
}
