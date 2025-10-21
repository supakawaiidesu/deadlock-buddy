"use client";

import { ReactNode } from "react";
import { TopNav } from "@/features/navigation/components/top-nav";
import { SideNav } from "@/features/navigation/components/side-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-[220px_calc(100vw-220px)] grid-rows-[56px_1fr]">
        <div className="col-span-2 row-start-1">
          <TopNav />
        </div>
        <aside className="row-start-2 border-r border-[var(--surface-border-muted)] bg-[var(--surface-muted)]">
          <SideNav />
        </aside>
        <main className="row-start-2 min-h-0 overflow-y-auto bg-[var(--background)] px-[2px] pt-[2px] pb-[2px]">
          {children}
        </main>
      </div>
    </div>
  );
}
