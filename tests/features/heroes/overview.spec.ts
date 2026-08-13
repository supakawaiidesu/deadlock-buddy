import { describe, expect, it } from 'vitest';
import { buildHeroOverviewRows } from '@/features/heroes/lib/overview';
import type { HeroScoreboardEntry } from '@/lib/api/schema';

const summaries = [
  { id: 101, name: 'Alpha' },
  { id: 102, name: 'Beta' },
  { id: 103, name: 'Gamma' },
  { id: 104, name: 'Zero' },
  { id: 105, name: 'NoWin' },
];

const winrateEntries: HeroScoreboardEntry[] = [
  { rank: 1, hero_id: 101, value: 0.54, matches: 29 },
  { rank: 2, hero_id: 102, value: 0.49, matches: 9 },
  { rank: 3, hero_id: 103, value: 0.51, matches: 4 },
  { rank: 4, hero_id: 104, value: 0.47, matches: 8 },
];

const popularityEntries: HeroScoreboardEntry[] = [
  { rank: 1, hero_id: 101, value: 300, matches: 30 },
  { rank: 2, hero_id: 102, value: 100, matches: 10 },
  { rank: 3, hero_id: 104, value: 0, matches: 0 },
  { rank: 4, hero_id: 999, value: 200, matches: 20 },
  { rank: 5, hero_id: 105, value: 50, matches: 5 },
];

describe('hero overview rows', () => {
  it('joins scoreboards in summary order with popularity precedence', () => {
    const rows = buildHeroOverviewRows(summaries, winrateEntries, popularityEntries);

    expect(rows.map((row) => row.name)).toEqual(['Alpha', 'Beta', 'Gamma', 'NoWin']);
    expect(rows.map((row) => row.matches)).toEqual([30, 10, 4, 5]);
    expect(rows.map((row) => row.players)).toEqual([300, 100, undefined, 50]);
    expect(rows.map((row) => row.winrate)).toEqual([0.54, 0.49, 0.51, undefined]);
    expect(rows.map((row) => row.tier)).toEqual(['S', 'C', 'B', null]);
    expect(rows.map((row) => row.pickRate)).toEqual([30 / 65, 10 / 65, 4 / 65, 5 / 65]);
  });
});
