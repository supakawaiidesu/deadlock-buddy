import { HeroOverviewPanel } from '@/features/heroes/components/hero-overview-panel';
import {
  defaultHeroesWidgetLayout,
  heroesWidgetRegistry,
} from '@/features/heroes/heroes-widget-registry';
import type { HeroesWidgetData } from '@/features/heroes/heroes-widget-types';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';

type HeroesWidgetLayoutProps =
  | {
      data: HeroesWidgetData;
      isLoading?: false;
    }
  | {
      data?: never;
      isLoading: true;
    };

export function HeroesWidgetLayout(props: HeroesWidgetLayoutProps) {
  const modeProps = props.isLoading
    ? {
        isLoading: true as const,
        renderLoading: (
          _instance: (typeof defaultHeroesWidgetLayout)[number],
          headerActions: React.ReactNode,
        ) => (
          <HeroOverviewPanel rows={[]} isLoading headerActions={headerActions} />
        ),
      }
    : { data: props.data };

  return (
    <WidgetGrid
      registry={heroesWidgetRegistry}
      defaultLayout={defaultHeroesWidgetLayout}
      storageKey="deadlock-buddy-heroes-layout.v1"
      emptyStateTitle="No widgets on the heroes page yet."
      useGridHeightOnMobile
      {...modeProps}
    />
  );
}
