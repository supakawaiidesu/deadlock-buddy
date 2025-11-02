"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { clsx } from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/heroes", label: "Heroes" },
  { href: "/meta", label: "Meta" },
];

const ADD_MENU_TOGGLE_EVENT = "dashboard:add-panel-menu-toggle";
const ADD_MENU_CLOSE_EVENT = "dashboard:add-panel-menu-close";
const ADD_MENU_STATE_EVENT = "dashboard:add-panel-menu-state";

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const active = useMemo(() => {
    const match = navLinks.find((link) => link.href !== "/" && pathname.startsWith(link.href));
    if (match) return match.href;
    return pathname;
  }, [pathname]);

  const isHome = pathname === "/";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === "boolean") {
        setIsAddMenuOpen(custom.detail.open);
      }
    };

    window.addEventListener(ADD_MENU_STATE_EVENT, handleState);
    return () => {
      window.removeEventListener(ADD_MENU_STATE_EVENT, handleState);
    };
  }, []);

  useEffect(() => {
    if (!isHome && typeof window !== "undefined") {
      setIsAddMenuOpen(false);
      window.dispatchEvent(new Event(ADD_MENU_CLOSE_EVENT));
    }
  }, [isHome]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    const numericId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(numericId) || numericId <= 0) {
      return;
    }
    router.push(`/players/${numericId}`);
    setValue("");
  }

  const handleToggleAddMenu = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(ADD_MENU_TOGGLE_EVENT));
  };

  return (
    <header className="grid h-14 grid-cols-[auto_1fr_auto] items-center border-b border-[var(--surface-border-muted)] bg-[var(--surface)] px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(245,247,245,0.65)]"
        >
          618Lock
        </Link>
        <nav className="hidden items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.5)] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "border-b border-transparent pb-1 transition-colors",
                active === link.href && "border-[var(--accent)] text-[var(--accent)]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 justify-self-center">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <label className="flex w-full items-center gap-2 rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.6)]">
            <span className="text-[rgba(245,247,245,0.45)]">ID</span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Account..."
              className="h-5 flex-1 border-none bg-transparent text-sm text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgba(245,247,245,0.35)]"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-[rgba(255,255,255,0.12)] bg-[var(--surface-muted)] text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(245,247,245,0.65)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            ↵
          </button>
        </form>
        {isHome ? (
          <button
            type="button"
            onClick={handleToggleAddMenu}
            aria-pressed={isAddMenuOpen}
            className={clsx(
              "hidden flex-shrink-0 items-center gap-2 rounded-sm border px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:flex",
              isAddMenuOpen
                ? "border-[var(--accent)] bg-[rgba(245,247,245,0.12)] text-white"
                : "border-[rgba(245,247,245,0.12)] bg-[rgba(245,247,245,0.05)] text-[rgba(245,247,245,0.65)] hover:border-[var(--accent)] hover:text-white",
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add panel</span>
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[rgba(245,247,245,0.4)] sm:flex">
          <span>Beta</span>
        </div>
      </div>
    </header>
  );
}
