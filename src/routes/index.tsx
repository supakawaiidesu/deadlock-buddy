import { createFileRoute, Link } from '@tanstack/react-router';
import { Panel } from '@/ui/panel';
import { DashboardLayout } from '@/features/dashboard/components/dashboard-layout';
import { useDashboardData } from '@/features/dashboard/api/queries';
import { Skeleton } from '@/ui/skeleton';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

const LEADERBOARD_REGION = 'NAmerica';

function DashboardPage() {
  const { data: dashboardData, isLoading, isError } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 py-6 text-center">
        <span className="border border-[var(--danger)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--danger)]">
          Error
        </span>
        <h2 className="text-2xl font-semibold text-white">Failed to load dashboard data.</h2>
        <p className="text-sm text-[rgba(245,247,245,0.65)]">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col gap-[2px] pb-[2px] font-mono text-[13px]">
      <div className="grid gap-[2px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[rgba(245,247,245,0.55)]">
            <span>Deadlock API Patch:10-09-24</span>
            <span>Region · {LEADERBOARD_REGION}</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold uppercase tracking-[0.14em] text-white">
            618Lock
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[rgba(245,247,245,0.7)]">
              something something deadlock opensource blah blah
            </p>
          </div>
          <div className="grid gap-[2px] sm:grid-cols-2">
            <Link
              to="/players"
              className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] bg-[var(--surface-muted)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.7)] transition hover:border-[var(--accent)] hover:text-white"
            >
              <span>Player lookup</span>
              <span className="text-[rgba(245,247,245,0.45)]">↗</span>
            </Link>
            <Link
              to="/players/$accountId"
              params={{ accountId: '342189169' }}
              className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] bg-[var(--surface-muted)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.7)] transition hover:border-[var(--accent)] hover:text-white"
            >
              <span>Sample profile</span>
              <span className="text-[rgba(245,247,245,0.45)]">↗</span>
            </Link>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-[2px] !p-0">
          <div className="panel-header">
            <h2 className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">Quick routes</h2>
            <span className="panel-header-meta">Primary</span>
          </div>
          <ul className="flex flex-col">
            <li className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>Hero directory</span>
              <Link to="/heroes" className="text-[rgba(245,247,245,0.45)] hover:text-[var(--accent)]">
                /heroes
              </Link>
            </li>
            <li className="flex items-center justify-between border-b border-[rgba(245,247,245,0.12)] px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>MMR leaderboards</span>
              <span className="text-[rgba(245,247,245,0.45)]">
                /leaderboards
              </span>
            </li>
            <li className="flex items-center justify-between px-4 py-3 text-xs text-[rgba(245,247,245,0.65)]">
              <span>Meta breakdown</span>
              <span className="text-[rgba(245,247,245,0.45)]">
                /meta
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      <DashboardLayout data={dashboardData} />
    </div>
  );
}
