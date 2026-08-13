import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRegistry,
} from '@/features/widgets/widget-types';
import type { HeroOverviewRow } from '@/features/heroes/lib/overview';

export type HeroesWidgetType = 'overview';

export type HeroesWidgetData = {
  rows: readonly HeroOverviewRow[];
};

export type HeroesWidgetInstance = WidgetInstance<HeroesWidgetType>;
export type HeroesWidgetDefinition = WidgetDefinition<HeroesWidgetType, HeroesWidgetData>;
export type HeroesWidgetRegistry = WidgetRegistry<HeroesWidgetType, HeroesWidgetData>;
