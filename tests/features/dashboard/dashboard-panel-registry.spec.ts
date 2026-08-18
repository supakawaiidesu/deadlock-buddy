import { describe, expect, it, vi } from 'vitest';
import {
  dashboardPanelRegistry,
  defaultDashboardLayout,
} from '@/features/dashboard/dashboard-panel-registry';
import { defaultHeroesWidgetLayout, heroesWidgetRegistry } from '@/features/heroes/heroes-widget-registry';
import { defaultPlayerWidgetLayout, playerWidgetRegistry } from '@/features/player-profile/player-widget-registry';
import { sanitizeWidgetLayout } from '@/features/widgets/widget-layout';
import {
  createDefaultGameStatsTimeSeriesSettings,
  createDefaultHeroWinrateOverTimeSettings,
} from '@/features/dashboard/dashboard-types';

describe('dashboard panel registry', () => {
  it('registers an add-picker-only wide hero winrate history panel', () => {
    const definition = dashboardPanelRegistry['hero-winrate-over-time'];

    expect(Object.keys(dashboardPanelRegistry)).toContain('hero-winrate-over-time');
    expect(definition).toMatchObject({
      title: 'Hero win rate over time',
      defaultW: 12,
      defaultH: 18,
      renderWhileLoading: true,
      previewSize: { width: 400, contentHeight: 158 },
    });
    expect(defaultDashboardLayout.some((panel) => panel.type === 'hero-winrate-over-time')).toBe(false);
  });

  it('creates defaults once and preserves valid settings while sanitizing geometry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T18:00:00Z'));
    try {
      const definition = dashboardPanelRegistry['hero-winrate-over-time'];
      const rect = { x: 0, y: 0, w: 12, h: 18 };
      const created = definition.createInstance('history', rect);
      const expectedSettings = createDefaultHeroWinrateOverTimeSettings();

      expect(created).toEqual({
        id: 'history',
        type: 'hero-winrate-over-time',
        ...rect,
        settings: expectedSettings,
      });
      const settings = {
        heroIds: [1, 2],
        minUnixTimestamp: 1_700_000_000,
        minAverageBadge: 91,
        maxAverageBadge: 116,
      };
      expect(definition.sanitizeInstance({ ...created, settings }, { ...rect, w: 1, h: 3 })).toEqual({
        id: 'history',
        type: 'hero-winrate-over-time',
        ...rect,
        w: 1,
        h: 3,
        settings,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('registers, creates, and sanitizes the picker-only total matches panel', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T18:00:00Z'));
    try {
      const definition = dashboardPanelRegistry['total-matches-over-time'];
      const rect = { x: 0, y: 0, w: 12, h: 18 };
      const created = definition.createInstance('matches', rect);
      const settings = {
        minUnixTimestamp: 1_785_430_800,
        minAverageBadge: 0,
        maxAverageBadge: 116,
      };

      expect(definition).toMatchObject({
        title: 'Total matches over time',
        description: 'Track daily match volume across a filtered sample.',
        defaultW: 12,
        defaultH: 18,
        renderWhileLoading: true,
        previewSize: { width: 400, contentHeight: 158 },
      });
      expect(created).toEqual({
        id: 'matches',
        type: 'total-matches-over-time',
        ...rect,
        settings: createDefaultGameStatsTimeSeriesSettings(),
      });
      expect(definition.sanitizeInstance({ ...created, settings }, { ...rect, w: 8 })).toEqual({
        id: 'matches',
        type: 'total-matches-over-time',
        ...rect,
        w: 8,
        settings,
      });
      expect(definition.sanitizeInstance({
        ...created,
        settings: { ...settings, minAverageBadge: 117 },
      }, rect)).toEqual(created);
      expect(defaultDashboardLayout.some((panel) => panel.type === 'total-matches-over-time'))
        .toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hydrates total-matches settings from the current dashboard layout', () => {
    const widget = {
      id: 'matches',
      type: 'total-matches-over-time' as const,
      x: 0,
      y: 0,
      w: 12,
      h: 18,
      settings: {
        minUnixTimestamp: 1_785_430_800,
        minAverageBadge: 0,
        maxAverageBadge: 116,
      },
    };

    expect(sanitizeWidgetLayout(
      [widget],
      dashboardPanelRegistry as Parameters<typeof sanitizeWidgetLayout>[1],
    )).toEqual([widget]);
  });

  it('maps every legacy dashboard default to four-times horizontal geometry', () => {
    expect(defaultDashboardLayout).toEqual([
      { id: 'panel-telemetry', type: 'telemetry-snapshot', x: 0, y: 0, w: 4, h: 9 },
      { id: 'panel-rank-distribution', type: 'rank-distribution', x: 4, y: 0, w: 8, h: 13 },
      { id: 'panel-na-leaderboard', type: 'na-leaderboard', x: 0, y: 9, w: 4, h: 13 },
      { id: 'panel-hero-popularity', type: 'hero-popularity', x: 4, y: 13, w: 4, h: 13 },
      { id: 'panel-hero-winrate', type: 'hero-winrate', x: 8, y: 13, w: 4, h: 13 },
      { id: 'panel-item-popularity', type: 'item-popularity', x: 0, y: 22, w: 4, h: 13 },
      { id: 'panel-item-winrate', type: 'item-winrate', x: 4, y: 26, w: 4, h: 13 },
      { id: 'panel-popular-layouts', type: 'popular-layouts', x: 8, y: 26, w: 4, h: 13 },
    ]);
  });

  it('maps heroes and player-profile defaults without changing vertical geometry', () => {
    expect(heroesWidgetRegistry.overview.defaultW).toBe(12);
    expect(defaultHeroesWidgetLayout).toEqual([
      { id: 'heroes-widget-overview', type: 'overview', x: 0, y: 0, w: 12, h: 24 },
    ]);
    expect(playerWidgetRegistry['top-heroes'].defaultW).toBe(4);
    expect(playerWidgetRegistry['hero-performance'].defaultW).toBe(8);
    expect(playerWidgetRegistry['match-history'].defaultW).toBe(8);
    expect(defaultPlayerWidgetLayout).toEqual([
      { id: 'player-widget-top-heroes', type: 'top-heroes', x: 0, y: 0, w: 4, h: 11 },
      { id: 'player-widget-hero-performance', type: 'hero-performance', x: 4, y: 0, w: 8, h: 13 },
      { id: 'player-widget-match-history', type: 'match-history', x: 4, y: 13, w: 8, h: 18 },
    ]);
  });
});
