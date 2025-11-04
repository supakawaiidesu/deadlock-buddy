'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroTier } from '@/features/heroes/hero-tier';

export type HeroOverviewRow = {
  heroId: number;
  name: string;
  slug: string;
  iconUrl: string | null;
  tier: HeroTier | null;
  winrate?: number;
  pickRate?: number;
  matches?: number;
  players?: number;
};

type SortKey = 'winrate' | 'pickRate' | 'matches' | 'players';

type SortDirection = 'asc' | 'desc';

type HeroOverviewTableProps = {
  rows: readonly HeroOverviewRow[];
};

function formatPercent(value?: number): string {
  if (typeof value !== 'number') return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value?: number): string {
  if (typeof value !== 'number') return '—';
  return value.toLocaleString();
}

function getMetricValue(row: HeroOverviewRow, key: SortKey): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  return Number.NEGATIVE_INFINITY;
}

export function HeroOverviewTable({ rows }: HeroOverviewTableProps) {
  const [sortState, setSortState] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'winrate',
    direction: 'desc',
  });

  const sortedRows = useMemo(() => {
    const cloned = [...rows];
    const { key, direction } = sortState;

    cloned.sort((a, b) => {
      const metricA = getMetricValue(a, key);
      const metricB = getMetricValue(b, key);

      if (metricA !== metricB) {
        return direction === 'desc' ? metricB - metricA : metricA - metricB;
      }

      const secondaryA = typeof a.winrate === 'number' ? a.winrate : Number.NEGATIVE_INFINITY;
      const secondaryB = typeof b.winrate === 'number' ? b.winrate : Number.NEGATIVE_INFINITY;

      if (secondaryA !== secondaryB) {
        return secondaryB - secondaryA;
      }

      return a.name.localeCompare(b.name);
    });

    return cloned;
  }, [rows, sortState]);

  const handleSortToggle = (key: SortKey) => {
    setSortState((current) => {
      if (current.key === key) {
        const nextDirection = current.direction === 'desc' ? 'asc' : 'desc';
        return { key, direction: nextDirection };
      }
      return { key, direction: 'desc' };
    });
  };

  const renderSortIndicator = (key: SortKey) => {
    const isActive = sortState.key === key;
    const baseTriClass = 'text-[8px] leading-none';
    const inactiveColor = 'text-[rgba(245,247,245,0.35)]';
    const activeColor = 'text-[var(--accent)]';

    const upColor = isActive && sortState.direction === 'asc' ? activeColor : inactiveColor;
    const downColor = isActive && sortState.direction === 'desc' ? activeColor : inactiveColor;

    return (
      <span className="flex flex-col items-center justify-center leading-none text-[8px]">
        <span className={`${baseTriClass} ${upColor} -mb-[1px]`}>▲</span>
        <span className={`${baseTriClass} ${downColor}`}>▼</span>
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-b border-[rgba(245,247,245,0.12)] text-left text-[12px]">
        <thead className="text-[rgba(245,247,245,0.55)]">
          <tr className="uppercase tracking-[0.18em]">
            <th className="px-4 py-3 text-sm font-medium">Rank</th>
            <th className="px-4 py-3 text-sm font-medium">Hero</th>
            <th className="px-4 py-3 text-sm font-medium">Tier</th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                onClick={() => handleSortToggle('winrate')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-white"
              >
                Win rate
                {renderSortIndicator('winrate')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                onClick={() => handleSortToggle('pickRate')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-white"
              >
                Pick rate
                {renderSortIndicator('pickRate')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                onClick={() => handleSortToggle('matches')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-white"
              >
                Games
                {renderSortIndicator('matches')}
              </button>
            </th>
            <th className="px-4 py-3 text-sm font-medium text-right">
              <button
                type="button"
                onClick={() => handleSortToggle('players')}
                className="flex w-full items-center justify-end gap-2 text-right transition hover:text-white"
              >
                Players
                {renderSortIndicator('players')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => {
            const rankLabel = index + 1;
            const tierLabel = row.tier ?? '—';

            return (
              <tr
                key={row.heroId}
                className="border-t border-[rgba(245,247,245,0.08)] transition hover:bg-[rgba(255,255,255,0.02)]"
              >
                <td className="px-4 py-3 text-[rgba(245,247,245,0.55)]">#{rankLabel}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {row.iconUrl ? (
                      <Image
                        src={row.iconUrl}
                        alt={`${row.name} icon`}
                        width={32}
                        height={32}
                        sizes="32px"
                        className="h-8 w-8 rounded-sm border border-[rgba(245,247,245,0.12)] object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[rgba(245,247,245,0.12)] text-[11px] uppercase text-[rgba(245,247,245,0.5)]">
                        {row.name.slice(0, 1)}
                      </span>
                    )}
                    <Link
                      href={`/heroes/${row.slug}`}
                      className="font-semibold text-white transition hover:text-[var(--accent)]"
                    >
                      {row.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[rgba(245,247,245,0.18)] text-[11px] font-semibold text-[rgba(245,247,245,0.8)]">
                    {tierLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[var(--accent)]">
                  {formatPercent(row.winrate)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatPercent(row.pickRate)}
                </td>
                <td className="px-4 py-3 text-right text-[rgba(245,247,245,0.75)]">
                  {formatNumber(row.matches)}
                </td>
                <td className="px-4 py-3 text-right text-[rgba(245,247,245,0.75)]">
                  {formatNumber(row.players)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
