import Image from 'next/image';
import { Panel } from '@/ui/panel';

export type HeroDetailMetric = {
  label: string;
  value: string;
  accent?: boolean;
};

type HeroDetailHeaderProps = {
  heroName: string;
  heroSlug: string;
  iconUrl: string | null;
  metrics: readonly HeroDetailMetric[];
};

export function HeroDetailHeader({ heroName, heroSlug, iconUrl, metrics }: HeroDetailHeaderProps) {
  return (
    <Panel className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:max-w-[420px] md:flex-1">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={`${heroName} icon`}
            width={72}
            height={72}
            sizes="72px"
            className="h-[72px] w-[72px] rounded-sm border border-[rgba(245,247,245,0.12)] object-cover"
          />
        ) : (
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-sm border border-[rgba(245,247,245,0.12)] text-2xl uppercase text-[rgba(245,247,245,0.55)]">
            {heroName.slice(0, 1)}
          </span>
        )}
        <div className="flex flex-col gap-2 text-left">
          <span className="text-[11px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.5)]">
            Hero dossier
          </span>
          <h1 className="font-[var(--font-display)] text-3xl font-semibold uppercase tracking-[0.14em] text-white md:text-4xl">
            {heroName}
          </h1>
          <span className="text-[10px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.55)]">
            /heroes/{heroSlug}
          </span>
        </div>
      </div>

      <div className="grid gap-[2px] sm:grid-cols-2 md:min-w-[260px] md:flex-1 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col gap-1 border border-[rgba(245,247,245,0.1)] bg-[rgba(255,255,255,0.015)] px-4 py-3 text-left"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-[rgba(245,247,245,0.5)]">
              {metric.label}
            </span>
            <span
              className={`text-lg font-semibold ${
                metric.accent ? 'text-[var(--accent)]' : 'text-white'
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
