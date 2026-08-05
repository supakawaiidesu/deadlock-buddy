import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRegistry,
} from '@/features/widgets/widget-types';

export type PlayerWidgetType =
  | 'hero-performance'
  | 'profile-signals'
  | 'match-history'
  | 'top-heroes';

export type PlayerWidgetData = {
  accountId: number;
};

export type PlayerWidgetInstance = WidgetInstance<PlayerWidgetType>;
export type PlayerWidgetDefinition = WidgetDefinition<PlayerWidgetType, PlayerWidgetData>;
export type PlayerWidgetRegistry = WidgetRegistry<PlayerWidgetType, PlayerWidgetData>;
