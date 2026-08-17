import {
  createDefaultHeroWinrateOverTimeSettings,
  type DashboardPanelInstance,
  type DashboardPanelRegistry,
  type HeroWinrateOverTimePanelInstance,
} from '@/features/dashboard/dashboard-types';
import { dashboardPanelManifest } from '@/features/dashboard/dashboard-panel-manifest';
import { RankDistributionPanel } from '@/features/analytics/components/rank-distribution-panel';
import { HeroLeaderboardPanel } from '@/features/heroes/components/hero-leaderboard-panel';
import { ItemLeaderboardPanel } from '@/features/items/components/item-leaderboard-panel';
import { HeroWinrateOverTimePanel } from '@/features/heroes/components/hero-winrate-over-time-panel';
import { NaLeaderboardPanel } from '@/features/dashboard/components/na-leaderboard-panel';
import { TelemetrySnapshotPanel } from '@/features/dashboard/components/telemetry-snapshot-panel';
import { PopularLayoutsPanel } from '@/features/dashboard/components/popular-layouts-panel';
import { heroSummaries } from '@/lib/data/heroes';
import type { GridRect } from '@/features/widgets/widget-engine';

const catalogHeroIds = new Set(heroSummaries.map((hero) => hero.id));

function createGeometryInstance<TType extends DashboardPanelInstance['type']>(
  type: TType,
  id: string,
  rect: GridRect,
): DashboardPanelInstance {
  return { id, type, ...rect } as DashboardPanelInstance;
}

function withGeometryLifecycle<TType extends DashboardPanelInstance['type']>(type: TType) {
  return {
    createInstance: (id: string, rect: GridRect) => createGeometryInstance(type, id, rect),
    sanitizeInstance: (raw: unknown, rect: GridRect) => {
      const id = raw && typeof raw === 'object' && 'id' in raw ? raw.id : '';
      return createGeometryInstance(type, typeof id === 'string' ? id : '', rect);
    },
  };
}

function isValidChartSettings(raw: unknown): raw is HeroWinrateOverTimePanelInstance['settings'] {
  if (!raw || typeof raw !== 'object') return false;
  if (!('heroIds' in raw) || !Array.isArray(raw.heroIds)) return false;
  if (!('minUnixTimestamp' in raw) || !('minAverageBadge' in raw) || !('maxAverageBadge' in raw)) {
    return false;
  }
  const { heroIds, minUnixTimestamp, minAverageBadge, maxAverageBadge } = raw;
  return (
    heroIds.length > 0 &&
    heroIds.length <= 8 &&
    heroIds.every((id) => Number.isSafeInteger(id) && catalogHeroIds.has(id)) &&
    new Set(heroIds).size === heroIds.length &&
    Number.isSafeInteger(minUnixTimestamp) &&
    typeof minUnixTimestamp === 'number' &&
    minUnixTimestamp > 0 &&
    Number.isSafeInteger(minAverageBadge) &&
    typeof minAverageBadge === 'number' &&
    minAverageBadge >= 0 &&
    minAverageBadge <= 116 &&
    Number.isSafeInteger(maxAverageBadge) &&
    typeof maxAverageBadge === 'number' &&
    maxAverageBadge >= 0 &&
    maxAverageBadge <= 116 &&
    minAverageBadge <= maxAverageBadge
  );
}

function createChartInstance(id: string, rect: GridRect): HeroWinrateOverTimePanelInstance {
  return {
    id,
    type: 'hero-winrate-over-time',
    ...rect,
    settings: createDefaultHeroWinrateOverTimeSettings(),
  };
}

export function sanitizeHeroWinrateOverTimeInstance(
  raw: unknown,
  rect: GridRect,
): HeroWinrateOverTimePanelInstance {
  const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
    ? raw.id
    : '';
  const settings = raw && typeof raw === 'object' && 'settings' in raw ? raw.settings : null;
  return {
    id,
    type: 'hero-winrate-over-time',
    ...rect,
    settings: isValidChartSettings(settings)
      ? { ...settings, heroIds: [...settings.heroIds] }
      : createDefaultHeroWinrateOverTimeSettings(),
  };
}

export const dashboardPanelRegistry: DashboardPanelRegistry = {
  'telemetry-snapshot': {
    type: 'telemetry-snapshot',
    ...dashboardPanelManifest['telemetry-snapshot'],
    ...withGeometryLifecycle('telemetry-snapshot'),
    render: ({ data, headerActions }) => data ? (
      <TelemetrySnapshotPanel
        leaderboardSampleSize={data.leaderboardEntries.length}
        heroCount={data.heroCount}
        highestBadge={data.highestBadge}
        heroWinrateEntries={data.heroWinrateEntries}
        headerActions={headerActions}
      />
    ) : null,
  },
  'rank-distribution': {
    type: 'rank-distribution',
    ...dashboardPanelManifest['rank-distribution'],
    ...withGeometryLifecycle('rank-distribution'),
    render: ({ data, headerActions }) => data ? (
      <RankDistributionPanel
        entries={data.rankDistributionEntries}
        minUnixTimestamp={data.rankDistributionMinUnixTimestamp}
        headerActions={headerActions}
      />
    ) : null,
  },
  'na-leaderboard': {
    type: 'na-leaderboard',
    ...dashboardPanelManifest['na-leaderboard'],
    ...withGeometryLifecycle('na-leaderboard'),
    render: ({ data, headerActions }) => data ? (
      <NaLeaderboardPanel entries={data.leaderboardEntries} headerActions={headerActions} />
    ) : null,
  },
  'hero-popularity': {
    type: 'hero-popularity',
    ...dashboardPanelManifest['hero-popularity'],
    ...withGeometryLifecycle('hero-popularity'),
    render: ({ instance, data, headerActions }) => data ? (
      <HeroLeaderboardPanel
        title="Hero popularity ranking"
        panelKey={`hero-popularity-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.heroPopularityEntries}
        headerActions={headerActions}
      />
    ) : null,
  },
  'hero-winrate': {
    type: 'hero-winrate',
    ...dashboardPanelManifest['hero-winrate'],
    ...withGeometryLifecycle('hero-winrate'),
    render: ({ instance, data, headerActions }) => data ? (
      <HeroLeaderboardPanel
        title="Hero winrate ranking"
        panelKey={`hero-winrate-${instance.id}`}
        mode="winrate"
        limit={50}
        initialEntries={data.heroWinrateEntries}
        headerActions={headerActions}
      />
    ) : null,
  },
  'hero-winrate-over-time': {
    type: 'hero-winrate-over-time',
    ...dashboardPanelManifest['hero-winrate-over-time'],
    createInstance: createChartInstance,
    sanitizeInstance: sanitizeHeroWinrateOverTimeInstance,
    renderWhileLoading: true,
    render: ({ instance, onInstanceChange, headerActions }) => {
      if (instance.type !== 'hero-winrate-over-time') return null;
      return (
        <HeroWinrateOverTimePanel
          settings={instance.settings}
          onSettingsChange={(settings) => onInstanceChange({ ...instance, settings })}
          headerActions={headerActions}
        />
      );
    },
  },
  'item-popularity': {
    type: 'item-popularity',
    ...dashboardPanelManifest['item-popularity'],
    ...withGeometryLifecycle('item-popularity'),
    render: ({ instance, data, headerActions }) => data ? (
      <ItemLeaderboardPanel
        title="Item popularity ranking"
        panelKey={`item-popularity-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.itemPopularityEntries}
        headerActions={headerActions}
      />
    ) : null,
  },
  'item-winrate': {
    type: 'item-winrate',
    ...dashboardPanelManifest['item-winrate'],
    ...withGeometryLifecycle('item-winrate'),
    render: ({ instance, data, headerActions }) => data ? (
      <ItemLeaderboardPanel
        title="Item winrate ranking"
        panelKey={`item-winrate-${instance.id}`}
        mode="winrate"
        limit={10}
        initialEntries={data.itemWinrateEntries}
        headerActions={headerActions}
      />
    ) : null,
  },
  'popular-layouts': {
    type: 'popular-layouts',
    ...dashboardPanelManifest['popular-layouts'],
    ...withGeometryLifecycle('popular-layouts'),
    render: ({ data, headerActions }) => data ? (
      <PopularLayoutsPanel entries={data.popularShares} headerActions={headerActions} />
    ) : null,
  },
};

export const defaultDashboardLayout: DashboardPanelInstance[] = [
  { id: 'panel-telemetry', type: 'telemetry-snapshot', x: 0, y: 0, w: 1, h: 9 },
  { id: 'panel-rank-distribution', type: 'rank-distribution', x: 1, y: 0, w: 2, h: 13 },
  { id: 'panel-na-leaderboard', type: 'na-leaderboard', x: 0, y: 9, w: 1, h: 13 },
  { id: 'panel-hero-popularity', type: 'hero-popularity', x: 1, y: 13, w: 1, h: 13 },
  { id: 'panel-hero-winrate', type: 'hero-winrate', x: 2, y: 13, w: 1, h: 13 },
  { id: 'panel-item-popularity', type: 'item-popularity', x: 0, y: 22, w: 1, h: 13 },
  { id: 'panel-item-winrate', type: 'item-winrate', x: 1, y: 26, w: 1, h: 13 },
  { id: 'panel-popular-layouts', type: 'popular-layouts', x: 2, y: 26, w: 1, h: 13 },
];
