import { HeroOverviewPanel } from '@/features/heroes/components/hero-overview-panel';
import {
  defaultHeroesWidgetLayout,
  heroesWidgetRegistry,
} from '@/features/heroes/heroes-widget-registry';
import type { HeroesWidgetData } from '@/features/heroes/heroes-widget-types';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';
import type { WidgetRenderSize } from '@/features/widgets/widget-types';

const HEROES_STORAGE_KEY = 'deadlock-buddy-heroes-layout.v2';
const LEGACY_HEROES_STORAGE_KEY = 'deadlock-buddy-heroes-layout.v1';

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
          size: WidgetRenderSize,
        ) => (
          <HeroOverviewPanel rows={[]} isLoading headerActions={headerActions} size={size} />
        ),
      }
    : { data: props.data };

  return (
    <WidgetGrid
      registry={heroesWidgetRegistry}
      defaultLayout={defaultHeroesWidgetLayout}
      storageKey={HEROES_STORAGE_KEY}
      legacyThreeColumnStorageKey={LEGACY_HEROES_STORAGE_KEY}
      emptyStateTitle="No widgets on the heroes page yet."
      useGridHeightOnMobile
      {...modeProps}
    />
  );
}
