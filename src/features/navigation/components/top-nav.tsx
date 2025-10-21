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
    <header className="flex h-14 items-center justify-between border-b border-[var(--surface-border-muted)] bg-[var(--surface)] px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.3em] text-[rgba(245,247,245,0.7)]">
          Deadlock Buddy
        </Link>
        <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.24em] text-[rgba(245,247,245,0.5)]">
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
      <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2 px-6">
        <label className="flex w-full items-center gap-2 border border-[var(--surface-border-muted)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[rgba(245,247,245,0.72)]">
          <span className="text-[rgba(245,247,245,0.45)]">ID:</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter player account ID"
            className="h-6 flex-1 border-none bg-transparent text-[var(--foreground)] outline-none"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Go
        </button>
      </form>
      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-[rgba(245,247,245,0.45)]">
        <span>Beta</span>
      </div>
    </header>
  );
}

