import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { AppProviders } from '@/providers';
import { AppShell } from '@/ui/app-shell';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AppProviders>
      <AppShell>
        <Outlet />
      </AppShell>
      <TanStackRouterDevtools position="bottom-right" />
    </AppProviders>
  );
}
