"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { label: "Dashboard", href: "/" },
  { label: "Players", href: "/players" },
  { label: "Heroes", href: "/heroes" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Patches", href: "/patches" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 px-4 py-6 text-sm uppercase tracking-[0.24em] text-[rgba(245,247,245,0.5)]">
      {links.map((link) => {
        const isActive = link.href === "/"
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "block border-l-2 border-transparent px-3 py-2 transition-colors",
              isActive && "border-[var(--accent)] text-[var(--accent)]",
              !isActive && "hover:text-[var(--foreground)]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

