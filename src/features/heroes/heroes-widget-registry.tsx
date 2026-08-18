import { HeroOverviewPanel } from '@/features/heroes/components/hero-overview-panel';
import { createGeometryWidgetLifecycle } from '@/features/widgets/widget-types';
import { TableWidgetPreview } from '@/features/widgets/components/widget-picker-previews';
import type {
  HeroesWidgetInstance,
  HeroesWidgetRegistry,
} from '@/features/heroes/heroes-widget-types';

export const heroesWidgetRegistry: HeroesWidgetRegistry = {
  overview: {
    type: 'overview',
    title: 'Hero overview',
    preview: (
      <TableWidgetPreview
        headers={['Hero', 'Win', 'Pick']}
        rows={[
          ['Abrams', '53.8%', '11.9%'],
          ['Bebop', '52.4%', '14.2%'],
          ['Dynamo', '51.7%', '8.6%'],
          ['Haze', '50.9%', '16.4%'],
        ]}
      />
    ),
    description: 'All active heroes ranked by win rate, pick rate, games, and players.',
    defaultW: 3,
    defaultH: 24,
    minW: 2,
    minH: 10,
    ...createGeometryWidgetLifecycle('overview'),
    render: ({ data, headerActions }) => data ? (
      <HeroOverviewPanel rows={data.rows} headerActions={headerActions} />
    ) : null,
  },
};

export const defaultHeroesWidgetLayout: HeroesWidgetInstance[] = [
  { id: 'heroes-widget-overview', type: 'overview', x: 0, y: 0, w: 3, h: 24 },
];
