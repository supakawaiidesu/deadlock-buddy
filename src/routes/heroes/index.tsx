import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useHeroOverviewData } from '@/features/heroes/api/queries';
import { HeroesWidgetLayout } from '@/features/heroes/components/heroes-widget-layout';
import type { HeroesWidgetData } from '@/features/heroes/heroes-widget-types';
import { buildHeroOverviewRows } from '@/features/heroes/lib/overview';
import { heroSummaries } from '@/lib/data/heroes';

export const Route = createFileRoute('/heroes/')({
  component: HeroesPage,
});

function HeroesPage() {
  const { data, isError } = useHeroOverviewData();

  const rows = useMemo(
    () =>
      data
        ? buildHeroOverviewRows(heroSummaries, data.winrateRaw, data.popularityRaw)
        : [],
    [data],
  );
  const widgetData = useMemo<HeroesWidgetData>(() => ({ rows }), [rows]);


  if (isError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          Error
        </span>
        <h2 className="text-2xl font-semibold text-[var(--text-strong)]">Failed to load hero data.</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-[4px] pb-[4px] font-mono text-[13px]">
      {data ? (
        <HeroesWidgetLayout data={widgetData} />
      ) : (
        <HeroesWidgetLayout isLoading />
      )}
    </div>
  );
}
