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
import type { RankDistributionEntry } from '@/lib/api/schema';

type RankDistributionPanelProps = {
  entries: readonly RankDistributionEntry[];
  minUnixTimestamp?: number;
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

type RankTier = {
  name: string;
  start: number;
  end: number;
};

const RANK_TIERS: RankTier[] = [
  { name: 'Initiate', start: 11, end: 16 },
  { name: 'Seeker', start: 21, end: 26 },
  { name: 'Alchemist', start: 31, end: 36 },
  { name: 'Arcanist', start: 41, end: 46 },
  { name: 'Ritualist', start: 51, end: 56 },
  { name: 'Emissary', start: 61, end: 66 },
  { name: 'Archon', start: 71, end: 76 },
  { name: 'Oracle', start: 81, end: 86 },
  { name: 'Phantom', start: 91, end: 96 },
  { name: 'Ascendant', start: 101, end: 106 },
  { name: 'Eternus', start: 111, end: 116 },
];

const TIER_COLORS: Record<string, string> = {
  Initiate: 'rgb(106, 62, 30)',
  Seeker: 'rgb(136, 35, 85)',
  Alchemist: 'rgb(92, 109, 171)',
  Arcanist: 'rgb(113, 156, 71)',
  Ritualist: 'rgb(221, 163, 38)',
  Emissary: 'rgb(238, 79, 87)',
  Archon: 'rgb(180, 127, 235)',
  Oracle: 'rgb(149, 81, 56)',
  Phantom: 'rgb(124, 124, 124)',
  Ascendant: 'rgb(195, 151, 81)',
  Eternus: 'rgb(85, 216, 157)',
  Unclassified: 'var(--accent)',
};

type ChartDatum = {
  rank: number;
  players: number;
  percent: number;
  tierName: string;
  tierLabel: string;
  color: string;
};

function findRankTier(rank: number): RankTier | null {
  return RANK_TIERS.find((tier) => rank >= tier.start && rank <= tier.end) ?? null;
}

function buildTierLabel(rank: number): { tierName: string; label: string } {
  const tier = findRankTier(rank);
  if (!tier) {
    return {
      tierName: 'Unclassified',
      label: `Rank ${rank}`,
    };
  }

  const subRank = rank - tier.start + 1;
  const suffix = subRank > 0 ? ` ${subRank}` : '';

  return {
    tierName: tier.name,
    label: `${tier.name}${suffix}`,
  };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '<0.1%';
  if (value >= 10) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
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
      <div className="flex items-center justify-between gap-4 text-[rgb(var(--text-rgb)/0.55)]">
        <span className="uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.6)]">
          {datum.tierName}
        </span>
        <span className="text-[rgb(var(--text-rgb)/0.45)]">#{datum.rank}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-6 text-[11px]">
        <span className="font-semibold text-[var(--text-strong)]">{datum.tierLabel}</span>
        <span className="font-semibold" style={{ color: datum.color }}>
          {formatPercent(datum.percent)}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text-rgb)/0.45)]">
        {datum.players.toLocaleString()} players
      </div>
    </div>
  );
}

export function RankDistributionPanel({
  entries,
  minUnixTimestamp,
  headerActions,
  outerRef,
}: RankDistributionPanelProps) {
  const totalPlayers = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.players ?? 0), 0),
    [entries],
  );

  const chartData: ChartDatum[] = useMemo(() => {
    if (totalPlayers <= 0) return [];

    return [...entries]
      .filter((entry) => typeof entry.rank === 'number' && typeof entry.players === 'number')
      .sort((a, b) => a.rank - b.rank)
      .map((entry) => {
        const { tierName, label } = buildTierLabel(entry.rank);
        const percent = totalPlayers > 0 ? (entry.players / totalPlayers) * 100 : 0;
        return {
          rank: entry.rank,
          players: entry.players,
          percent,
          tierName,
          tierLabel: label,
          color: TIER_COLORS[tierName] ?? TIER_COLORS.Unclassified,
        };
      });
  }, [entries, totalPlayers]);

  const timeLabel = useMemo(() => formatTimeBadge(minUnixTimestamp), [minUnixTimestamp]);
  const playersLabel = useMemo(
    () => `${totalPlayers.toLocaleString()} Players`,
    [totalPlayers],
  );

  return (
    <Panel ref={outerRef} className="flex h-full flex-col gap-[4px] !p-0">
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

      <div className="flex flex-1 flex-col px-4 pb-0">
        {chartData.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.12)] bg-[rgb(var(--text-rgb)/0.02)] px-4 text-center text-xs text-[rgb(var(--text-rgb)/0.6)]">
            Distribution data unavailable. Try again later.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="focus:outline-none focus-visible:outline-none"
            >
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 6, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgb(var(--text-rgb)/0.08)"
                />
                <XAxis
                  dataKey="rank"
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--text-rgb)/0.12)' }}
                  stroke="rgb(var(--text-rgb)/0.45)"
                  tick={{ fontSize: 10 }}
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
