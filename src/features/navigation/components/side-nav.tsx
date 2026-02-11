import { Link, useLocation } from '@tanstack/react-router';
import { clsx } from 'clsx';

const links = [
  { label: 'Dashboard', href: '/' },
  { label: 'Players', href: '/players' },
  { label: 'Heroes', href: '/heroes' },
  { label: 'Leaderboards', href: '/leaderboards' },
  { label: 'Patches', href: '/patches' },
];

export function SideNav() {
  const pathname = useLocation({ select: (loc) => loc.pathname });

  return (
    <nav className="flex h-full flex-col gap-0 bg-[var(--surface)]">
      {links.map((link) => {
        const isActive = link.href === '/'
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            to={link.href}
            title={link.label}
            className={clsx(
              'flex aspect-square w-full items-center justify-center border border-[rgba(255,255,255,0.05)] bg-[var(--surface-muted)] transition-colors',
              isActive && 'bg-[rgba(63,201,109,0.08)]',
              !isActive && 'hover:border-[var(--accent)]',
            )}
          >
            <span className="sr-only">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
