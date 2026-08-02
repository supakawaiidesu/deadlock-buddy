import { ReactNode } from "react";
import { TopNav } from "@/features/navigation/components/top-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-rows-[52px_minmax(0,1fr)]">
        <TopNav />
        <main className="scrollbar-hidden min-h-0 overflow-y-auto bg-[var(--background)] px-[4px] pt-[4px] pb-[4px]">
          {children}
        </main>
      </div>
    </div>
  );
}
