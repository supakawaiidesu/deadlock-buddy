import { HeroOverviewPanel } from '@/features/heroes/components/hero-overview-panel';
import type {
  HeroesWidgetInstance,
  HeroesWidgetRegistry,
} from '@/features/heroes/heroes-widget-types';

export const heroesWidgetRegistry: HeroesWidgetRegistry = {
  overview: {
    type: 'overview',
    title: 'Hero overview',
    description: 'All active heroes ranked by win rate, pick rate, games, and players.',
    defaultW: 3,
    defaultH: 24,
    minW: 2,
    minH: 10,
    render: ({ data, headerActions }) => (
      <HeroOverviewPanel rows={data.rows} headerActions={headerActions} />
    ),
  },
};

export const defaultHeroesWidgetLayout: HeroesWidgetInstance[] = [
  { id: 'heroes-widget-overview', type: 'overview', x: 0, y: 0, w: 3, h: 24 },
];
