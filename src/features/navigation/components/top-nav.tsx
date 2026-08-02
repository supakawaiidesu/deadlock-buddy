import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/players', label: 'Players' },
  { href: '/heroes', label: 'Heroes' },
  { href: '/meta', label: 'Meta' },
];

const ADD_MENU_TOGGLE_EVENT = 'dashboard:add-panel-menu-toggle';
const ADD_MENU_CLOSE_EVENT = 'dashboard:add-panel-menu-close';
const ADD_MENU_STATE_EVENT = 'dashboard:add-panel-menu-state';

export function TopNav() {
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const active = useMemo(() => {
    const match = navLinks.find((link) => link.href !== '/' && pathname.startsWith(link.href));
    if (match) return match.href;
    return pathname;
  }, [pathname]);

  const isHome = pathname === '/';

  useEffect(() => {
    const handleState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === 'boolean') {
        setIsAddMenuOpen(custom.detail.open);
      }
    };

    window.addEventListener(ADD_MENU_STATE_EVENT, handleState);
    return () => {
      window.removeEventListener(ADD_MENU_STATE_EVENT, handleState);
    };
  }, []);

  useEffect(() => {
    if (!isHome) {
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
    navigate({ to: '/players/$accountId', params: { accountId: String(numericId) } });
    setValue('');
  }

  const handleToggleAddMenu = () => {
    window.dispatchEvent(new Event(ADD_MENU_TOGGLE_EVENT));
  };

  return (
    <header className="panel panel-header !grid h-12 mx-[4px] mt-[4px] grid-cols-[auto_minmax(0,1fr)_auto] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 self-stretch">
        <Link
          to="/"
          aria-label="618Lock home"
          className="panel-header-interactive panel-header-meta flex-none border-r border-[var(--surface-border-muted)] !px-4 font-semibold !tracking-[0.24em]"
        >
          <span className="text-white">618</span>
          <span className="text-[var(--accent)]">Lock</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden self-stretch border-r border-[var(--surface-border-muted)] lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={clsx(
                'panel-header-interactive panel-header-meta',
                active === link.href &&
                  'bg-[var(--accent-subtle)] !text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex min-w-0 w-full justify-center self-stretch lg:w-auto">
        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 self-stretch border-l border-[var(--surface-border-muted)] md:w-[clamp(15rem,24vw,22rem)] md:flex-none"
        >
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[rgba(245,247,245,0.45)] transition-colors focus-within:bg-[var(--accent-subtle)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)] sm:px-4">
            <span className="sr-only">Search by Deadlock account ID</span>
            <Search className="h-4 w-4 flex-none" aria-hidden="true" />
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Account ID..."
              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgba(245,247,245,0.35)] sm:text-sm"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            className="panel-header-action"
            aria-label="Search for player"
            title="Search for player"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        {isHome ? (
          <button
            type="button"
            onClick={handleToggleAddMenu}
            aria-pressed={isAddMenuOpen}
            aria-label="Add dashboard panel"
            title="Add dashboard panel"
            className={clsx(
              'panel-header-action border-r border-[var(--surface-border-muted)]',
              isAddMenuOpen && 'bg-[var(--accent-muted)] !text-[var(--accent)]',
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="panel-header-actions justify-self-end">
        <span className="panel-header-meta hidden border-l border-[var(--surface-border-muted)] lg:flex">
          Beta
        </span>
      </div>
    </header>
  );
}
