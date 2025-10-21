import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-[calc(100vh-56px)] flex-col gap-[2px] overflow-hidden pb-[2px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,_rgba(63,201,109,0.08)_0%,_rgba(4,4,5,0.85)_40%,_rgba(4,4,5,1)_100%)]" />
      <div className="relative z-10 flex w-full flex-col gap-[2px] text-left">
        <span className="border border-[var(--surface-border-muted)] bg-[var(--surface-muted)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(245,247,245,0.6)]">
          Deadlock Buddy
        </span>
        <h1 className="font-[var(--font-display)] text-4xl font-semibold text-white md:text-6xl">
          Competitive intelligence for every Deadlock hero and player
        </h1>
        <p className="text-lg text-[rgba(245,247,245,0.72)]">
          Dive into curated performance dashboards, MMR momentum charts, and data-rich hero insights.
          Built for high-signal decision making, tuned for fast iteration.
        </p>
        <div className="flex flex-wrap items-center gap-[2px]">
          <Link
            href="/players"
            className="inline-flex items-center justify-center border border-[var(--surface-border)] bg-[var(--surface-muted)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
          >
            Look up a player
          </Link>
          <Link
            href="/players/342189169"
            className="inline-flex items-center justify-center border border-[var(--surface-border-muted)] bg-transparent px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[rgba(245,247,245,0.72)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
          >
            Sample profile
          </Link>
        </div>
      </div>
    </div>
  );
}
