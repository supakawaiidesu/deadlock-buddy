import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Palette, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { getTheme } from '@/features/theme/theme';
import { useTheme } from '@/features/theme/theme-provider';
import {
  WIDGET_ADD_MENU_CLOSE_EVENT,
  WIDGET_ADD_MENU_STATE_EVENT,
  WIDGET_ADD_MENU_TOGGLE_EVENT,
} from '@/features/widgets/widget-events';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/players', label: 'Players' },
  { href: '/heroes', label: 'Heroes' },
  { href: '/meta', label: 'Meta' },
];
const WIDGET_SURFACE_PATTERNS = [/^\/$/, /^\/players\/\d+\/?$/];


export function TopNav() {
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const navigate = useNavigate();
  const { themeId, themes, setThemeId } = useTheme();
  const currentTheme = getTheme(themeId);
  const [value, setValue] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(() => {
    const match = navLinks.find((link) => link.href !== '/' && pathname.startsWith(link.href));
    if (match) return match.href;
    return pathname;
  }, [pathname]);

  const hasWidgetSurface = WIDGET_SURFACE_PATTERNS.some((pattern) => pattern.test(pathname));

  useEffect(() => {
    const handleState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === 'boolean') {
        setIsAddMenuOpen(custom.detail.open);
      }
    };

    window.addEventListener(WIDGET_ADD_MENU_STATE_EVENT, handleState);
    return () => {
      window.removeEventListener(WIDGET_ADD_MENU_STATE_EVENT, handleState);
    };
  }, []);

  useEffect(() => {
    if (!hasWidgetSurface) {
      setIsAddMenuOpen(false);
      window.dispatchEvent(new Event(WIDGET_ADD_MENU_CLOSE_EVENT));
    }
  }, [hasWidgetSurface]);

  useEffect(() => {
    if (!isThemeMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsThemeMenuOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const menuNode = themeMenuRef.current;
      if (menuNode && target && !menuNode.contains(target)) {
        setIsThemeMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isThemeMenuOpen]);

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
    window.dispatchEvent(new Event(WIDGET_ADD_MENU_TOGGLE_EVENT));
  };

  return (
    <header className="panel panel-header !grid h-12 mx-[4px] mt-[4px] grid-cols-[auto_minmax(0,1fr)_auto] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 self-stretch">
        <Link
          to="/"
          aria-label="618Lock home"
          className="panel-header-interactive panel-header-meta flex-none border-r border-[var(--surface-border-muted)] !px-4 font-semibold !tracking-[0.24em]"
        >
          <span className="text-[var(--text-strong)]">618</span>
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
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[rgb(var(--text-rgb)/0.45)] transition-colors focus-within:bg-[var(--accent-subtle)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)] sm:px-4">
            <span className="sr-only">Search by Deadlock account ID</span>
            <Search className="h-4 w-4 flex-none" aria-hidden="true" />
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Account ID..."
              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgb(var(--text-rgb)/0.35)] sm:text-sm"
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

        {hasWidgetSurface ? (
          <button
            type="button"
            onClick={handleToggleAddMenu}
            aria-pressed={isAddMenuOpen}
            aria-label="Add widget"
            title="Add widget"
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
        <div ref={themeMenuRef} className="relative self-stretch">
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen((open) => !open)}
            aria-expanded={isThemeMenuOpen}
            aria-haspopup="menu"
            aria-label={`Theme: ${currentTheme.label}. Open theme menu`}
            title={`Theme: ${currentTheme.label}. Open theme menu`}
            className={clsx(
              'panel-header-action',
              isThemeMenuOpen && 'bg-[var(--accent-muted)] !text-[var(--accent)]',
            )}
          >
            <Palette className="h-4 w-4" aria-hidden="true" />
          </button>
          {isThemeMenuOpen ? (
            <div
              role="menu"
              aria-label="Theme options"
              className="absolute right-0 top-[calc(100%+4px)] z-[70] w-44 rounded-sm border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] p-2 shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm"
            >
              <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--text-rgb)/0.5)]">
                Theme
              </span>
              <div className="flex flex-col gap-1">
                {themes.map((theme) => {
                  const isSelected = theme.id === themeId;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setThemeId(theme.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--text-rgb)/0.75)] transition',
                        isSelected
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                          : 'hover:bg-[var(--accent-subtle)] hover:text-[var(--text-strong)]',
                      )}
                    >
                      <span
                        className="flex h-4 w-7 flex-none overflow-hidden border border-[var(--surface-border-muted)]"
                        aria-hidden="true"
                      >
                        <span className="flex-1" style={{ backgroundColor: theme.tokens['--background'] }} />
                        <span className="flex-1" style={{ backgroundColor: theme.tokens['--surface'] }} />
                        <span className="flex-1" style={{ backgroundColor: theme.tokens['--accent'] }} />
                      </span>
                      <span className="min-w-0 flex-1">{theme.label}</span>
                      {isSelected ? <Check className="h-4 w-4 flex-none" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
