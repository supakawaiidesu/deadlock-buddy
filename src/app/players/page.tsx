import { AccountSearchForm } from '@/features/player-search/components/account-search-form';

export default function PlayerSearchPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] w-full flex-col gap-[2px] pb-[2px]">
      <div className="flex flex-col gap-[2px] text-left">
        <span className="border border-[var(--surface-border-muted)] bg-[var(--surface-muted)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(245,247,245,0.6)]">
          Player Lookup
        </span>
        <h1 className="font-[var(--font-display)] text-4xl font-semibold text-white md:text-5xl">
          Track your climb with 618Lock
        </h1>
        <p className="text-lg text-[rgba(245,247,245,0.72)]">
          Enter a Valve account ID to explore match performance, MMR trends, and hero mastery.
        </p>
      </div>
      <AccountSearchForm className="w-full" />
      <p className="text-xs text-[rgba(245,247,245,0.48)]">
        We respect the upstream API guidelines and throttle requests automatically to keep things
        fast and reliable.
      </p>
    </div>
  );
}
