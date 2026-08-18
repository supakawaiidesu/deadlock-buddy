import {
  createDefaultGameStatsTimeSeriesSettings,
  createDefaultHeroWinrateOverTimeSettings,
  type DashboardPanelInstance,
  type DashboardPanelRegistry,
  type HeroWinrateOverTimePanelInstance,
  type TotalMatchesOverTimePanelInstance,
} from '@/features/dashboard/dashboard-types';
import { dashboardPanelManifest } from '@/features/dashboard/dashboard-panel-manifest';
import { RankDistributionPanel } from '@/features/analytics/components/rank-distribution-panel';
import { TotalMatchesOverTimePanel } from '@/features/analytics/components/total-matches-over-time-panel';
import { HeroLeaderboardPanel } from '@/features/heroes/components/hero-leaderboard-panel';
import { ItemLeaderboardPanel } from '@/features/items/components/item-leaderboard-panel';
import { HeroWinrateOverTimePanel } from '@/features/heroes/components/hero-winrate-over-time-panel';
import { NaLeaderboardPanel } from '@/features/dashboard/components/na-leaderboard-panel';
import { TelemetrySnapshotPanel } from '@/features/dashboard/components/telemetry-snapshot-panel';
import { PopularLayoutsPanel } from '@/features/dashboard/components/popular-layouts-panel';
import { getHeroIconUrl, heroSummaries } from '@/lib/data/heroes';
import { TIER_COLORS } from '@/lib/data/ranks';
import type { GridRect } from '@/features/widgets/widget-engine';
import {
  HistogramWidgetPreview,
  LineWidgetPreview,
  MetricWidgetPreview,
  RowsWidgetPreview,
} from '@/features/widgets/components/widget-picker-previews';

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

function isValidAnalyticsTimeSeriesSettings(raw: unknown): raw is TotalMatchesOverTimePanelInstance['settings'] {
  if (!raw || typeof raw !== 'object') return false;
  if (!('minUnixTimestamp' in raw) || !('minAverageBadge' in raw) || !('maxAverageBadge' in raw)) {
    return false;
  }
  const { minUnixTimestamp, minAverageBadge, maxAverageBadge } = raw;
  return (
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

function isValidHeroChartSettings(raw: unknown): raw is HeroWinrateOverTimePanelInstance['settings'] {
  if (!isValidAnalyticsTimeSeriesSettings(raw)) return false;
  if (!('heroIds' in raw) || !Array.isArray(raw.heroIds)) return false;
  const { heroIds } = raw;
  return (
    heroIds.length > 0 &&
    heroIds.length <= 8 &&
    heroIds.every((id) => Number.isSafeInteger(id) && catalogHeroIds.has(id)) &&
    new Set(heroIds).size === heroIds.length
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
    settings: isValidHeroChartSettings(settings)
      ? { ...settings, heroIds: [...settings.heroIds] }
      : createDefaultHeroWinrateOverTimeSettings(),
  };
}

function createTotalMatchesOverTimeInstance(
  id: string,
  rect: GridRect,
): TotalMatchesOverTimePanelInstance {
  return {
    id,
    type: 'total-matches-over-time',
    ...rect,
    settings: createDefaultGameStatsTimeSeriesSettings(),
  };
}

export function sanitizeTotalMatchesOverTimeInstance(
  raw: unknown,
  rect: GridRect,
): TotalMatchesOverTimePanelInstance {
  const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
    ? raw.id
    : '';
  const settings = raw && typeof raw === 'object' && 'settings' in raw ? raw.settings : null;
  return {
    id,
    type: 'total-matches-over-time',
    ...rect,
    settings: isValidAnalyticsTimeSeriesSettings(settings)
      ? { ...settings }
      : createDefaultGameStatsTimeSeriesSettings(),
  };
}

export const dashboardPanelRegistry: DashboardPanelRegistry = {
  'telemetry-snapshot': {
    type: 'telemetry-snapshot',
    ...dashboardPanelManifest['telemetry-snapshot'],
    preview: (
      <MetricWidgetPreview
        metrics={[
          { label: 'Players', value: '48.2K' },
          { label: 'Heroes', value: '31' },
          { label: 'Top rank', value: 'Obscurus' },
        ]}
      />
    ),
    ...withGeometryLifecycle('telemetry-snapshot'),
    render: ({ data, headerActions, size }) => data ? (
      <TelemetrySnapshotPanel
        leaderboardSampleSize={data.leaderboardEntries.length}
        heroCount={data.heroCount}
        highestBadge={data.highestBadge}
        heroWinrateEntries={data.heroWinrateEntries}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'rank-distribution': {
    type: 'rank-distribution',
    ...dashboardPanelManifest['rank-distribution'],
    preview: (
      <HistogramWidgetPreview
        bands={[
          { label: 'Acolyte', color: TIER_COLORS.Acolyte, values: [14, 22, 31, 43, 55, 66] },
          { label: 'Sentinel', color: TIER_COLORS.Sentinel, values: [74, 82, 90, 95, 91, 86] },
          { label: 'Mystic', color: TIER_COLORS.Mystic, values: [79, 70, 61, 51, 42, 33] },
          { label: 'Ritualist', color: TIER_COLORS.Ritualist, values: [27, 21, 16, 11, 7, 4] },
        ]}
      />
    ),
    ...withGeometryLifecycle('rank-distribution'),
    render: ({ data, headerActions, size }) => data ? (
      <RankDistributionPanel
        entries={data.rankDistributionEntries}
        minUnixTimestamp={data.rankDistributionMinUnixTimestamp}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'na-leaderboard': {
    type: 'na-leaderboard',
    ...dashboardPanelManifest['na-leaderboard'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: '1  Hydration', value: '1,948', meta: 'NA · Obscurus' },
          { label: '2  Lefaa', value: '1,921', meta: 'NA · Obscurus' },
          { label: '3  MikaelS', value: '1,897', meta: 'NA · Eternus' },
        ]}
      />
    ),
    ...withGeometryLifecycle('na-leaderboard'),
    render: ({ data, headerActions, size }) => data ? (
      <NaLeaderboardPanel entries={data.leaderboardEntries} headerActions={headerActions} size={size} />
    ) : null,
  },
  'hero-popularity': {
    type: 'hero-popularity',
    ...dashboardPanelManifest['hero-popularity'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: 'Abrams', value: '82.4K', meta: 'matches' },
          { label: 'Bebop', value: '76.1K', meta: 'matches' },
          { label: 'Haze', value: '71.8K', meta: 'matches' },
        ]}
      />
    ),
    ...withGeometryLifecycle('hero-popularity'),
    render: ({ instance, data, headerActions, size }) => data ? (
      <HeroLeaderboardPanel
        title="Hero popularity ranking"
        panelKey={`hero-popularity-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.heroPopularityEntries}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'hero-winrate': {
    type: 'hero-winrate',
    ...dashboardPanelManifest['hero-winrate'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: 'Infernus', value: '54.8%', meta: '63.2K matches' },
          { label: 'Dynamo', value: '53.9%', meta: '48.7K matches' },
          { label: 'Grey Talon', value: '52.7%', meta: '41.4K matches' },
        ]}
      />
    ),
    ...withGeometryLifecycle('hero-winrate'),
    render: ({ instance, data, headerActions, size }) => data ? (
      <HeroLeaderboardPanel
        title="Hero winrate ranking"
        panelKey={`hero-winrate-${instance.id}`}
        mode="winrate"
        limit={50}
        initialEntries={data.heroWinrateEntries}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'hero-winrate-over-time': {
    type: 'hero-winrate-over-time',
    ...dashboardPanelManifest['hero-winrate-over-time'],
    previewSize: { width: 400, contentHeight: 158 },
    preview: (
      <LineWidgetPreview
        series={[
          {
            color: 'var(--chart-series-1)',
            points: '18,64 56,59 94,62 132,46 170,50 208,36 246,40 282,27',
            label: 'Infernus',
            iconUrl: getHeroIconUrl(1),
          },
          {
            color: 'var(--chart-series-2)',
            points: '18,40 56,44 94,35 132,42 170,31 208,34 246,24 282,30',
            label: 'Seven',
            iconUrl: getHeroIconUrl(2),
          },
          {
            color: 'var(--chart-series-3)',
            points: '18,72 56,67 94,75 132,61 170,65 208,52 246,58 282,49',
            label: 'Haze',
            iconUrl: getHeroIconUrl(13),
          },
        ]}
      />
    ),
    createInstance: createChartInstance,
    sanitizeInstance: sanitizeHeroWinrateOverTimeInstance,
    renderWhileLoading: true,
    render: ({ instance, onInstanceChange, headerActions, size }) => {
      if (instance.type !== 'hero-winrate-over-time') return null;
      return (
        <HeroWinrateOverTimePanel
          settings={instance.settings}
          onSettingsChange={(settings) => onInstanceChange({ ...instance, settings })}
          headerActions={headerActions}
          size={size}
        />
      );
    },
  },
  'total-matches-over-time': {
    type: 'total-matches-over-time',
    ...dashboardPanelManifest['total-matches-over-time'],
    previewSize: { width: 400, contentHeight: 158 },
    preview: (
      <LineWidgetPreview
        series={[{
          color: 'var(--chart-series-1)',
          points: '18,72 56,65 94,70 132,54 170,48 208,34 246,40 282,24',
          label: 'Matches',
        }]}
        axisLabels={['75K', '50K', '25K']}
        showLegend={false}
      />
    ),
    createInstance: createTotalMatchesOverTimeInstance,
    sanitizeInstance: sanitizeTotalMatchesOverTimeInstance,
    renderWhileLoading: true,
    render: ({ instance, onInstanceChange, headerActions, size }) => {
      if (instance.type !== 'total-matches-over-time') return null;
      return (
        <TotalMatchesOverTimePanel
          settings={instance.settings}
          onSettingsChange={(settings) => onInstanceChange({ ...instance, settings })}
          headerActions={headerActions}
          size={size}
        />
      );
    },
  },
  'item-popularity': {
    type: 'item-popularity',
    ...dashboardPanelManifest['item-popularity'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: 'Close Quarters', value: '92.1K', meta: 'purchases' },
          { label: 'Sprint Boots', value: '87.6K', meta: 'purchases' },
          { label: 'Extra Health', value: '80.3K', meta: 'purchases' },
        ]}
      />
    ),
    ...withGeometryLifecycle('item-popularity'),
    render: ({ instance, data, headerActions, size }) => data ? (
      <ItemLeaderboardPanel
        title="Item popularity ranking"
        panelKey={`item-popularity-${instance.id}`}
        mode="popularity"
        limit={50}
        initialEntries={data.itemPopularityEntries}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'item-winrate': {
    type: 'item-winrate',
    ...dashboardPanelManifest['item-winrate'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: 'Extra Spirit', value: '57.2%', meta: '38.4K matches' },
          { label: 'Mystic Burst', value: '55.9%', meta: '35.1K matches' },
          { label: 'Close Quarters', value: '54.8%', meta: '42.7K matches' },
        ]}
      />
    ),
    ...withGeometryLifecycle('item-winrate'),
    render: ({ instance, data, headerActions, size }) => data ? (
      <ItemLeaderboardPanel
        title="Item winrate ranking"
        panelKey={`item-winrate-${instance.id}`}
        mode="winrate"
        limit={10}
        initialEntries={data.itemWinrateEntries}
        headerActions={headerActions}
        size={size}
      />
    ) : null,
  },
  'popular-layouts': {
    type: 'popular-layouts',
    ...dashboardPanelManifest['popular-layouts'],
    preview: (
      <RowsWidgetPreview
        rows={[
          { label: 'Haze', value: '12.4K', meta: 'views · Standard carry' },
          { label: 'Abrams', value: '9.8K', meta: 'views · Frontline' },
          { label: 'Dynamo', value: '8.1K', meta: 'views · Support' },
        ]}
      />
    ),
    ...withGeometryLifecycle('popular-layouts'),
    render: ({ data, headerActions, size }) => data ? (
      <PopularLayoutsPanel entries={data.popularShares} headerActions={headerActions} size={size} />
    ) : null,
  },
};

export const defaultDashboardLayout: DashboardPanelInstance[] = [
  { id: 'panel-telemetry', type: 'telemetry-snapshot', x: 0, y: 0, w: 4, h: 9 },
  { id: 'panel-rank-distribution', type: 'rank-distribution', x: 4, y: 0, w: 8, h: 13 },
  { id: 'panel-na-leaderboard', type: 'na-leaderboard', x: 0, y: 9, w: 4, h: 13 },
  { id: 'panel-hero-popularity', type: 'hero-popularity', x: 4, y: 13, w: 4, h: 13 },
  { id: 'panel-hero-winrate', type: 'hero-winrate', x: 8, y: 13, w: 4, h: 13 },
  { id: 'panel-item-popularity', type: 'item-popularity', x: 0, y: 22, w: 4, h: 13 },
  { id: 'panel-item-winrate', type: 'item-winrate', x: 4, y: 26, w: 4, h: 13 },
  { id: 'panel-popular-layouts', type: 'popular-layouts', x: 8, y: 26, w: 4, h: 13 },
];
