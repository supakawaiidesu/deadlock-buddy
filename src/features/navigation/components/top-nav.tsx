"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { clsx } from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/heroes", label: "Heroes" },
  { href: "/meta", label: "Meta" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [value, setValue] = useState("");

  const active = useMemo(() => {
    const match = navLinks.find((link) => link.href !== "/" && pathname.startsWith(link.href));
    if (match) return match.href;
    return pathname;
  }, [pathname]);

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

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--surface-border-muted)] bg-[var(--surface)] px-4">
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
              'border-b border-transparent pb-1 transition-colors',
              active === link.href && 'border-[var(--accent)] text-[var(--accent)]',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form onSubmit={handleSubmit} className="ml-auto flex w-full max-w-sm items-center gap-2">
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
      <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[rgba(245,247,245,0.4)] sm:flex">
        <span>Beta</span>
      </div>
    </header>
  );
}
