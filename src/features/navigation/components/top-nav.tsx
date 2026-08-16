import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Palette, Plus, Share2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { AccountSearchForm } from '@/features/player-search/components/account-search-form';
import { useCustomPages } from '@/features/custom-pages/custom-pages-provider';
import {
  buildCustomPageNavigation,
  buildCustomPageShareUrl,
  getCustomPageCloseDestination,
  type CustomPageTab,
} from '@/features/custom-pages/custom-page-state';
import { getTheme } from '@/features/theme/theme';
import { useTheme } from '@/features/theme/theme-provider';
import {
  WIDGET_ADD_MENU_CLOSE_EVENT,
  WIDGET_ADD_MENU_STATE_EVENT,
  WIDGET_ADD_MENU_TOGGLE_EVENT,
} from '@/features/widgets/widget-events';

const navLinks = [
  { href: '/players' as const, label: 'Players' },
  { href: '/heroes' as const, label: 'Heroes' },
];
const WIDGET_SURFACE_PATTERNS = [
  /^\/$/,
  /^\/heroes\/?$/,
  /^\/players\/\d+\/?$/,
  /^\/tab\/[1-9]\d*\/?$/,
];

function isFixedRouteActive(
  href: (typeof navLinks)[number]['href'],
  pathname: string,
) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCustomRouteActive(tabNumber: number, pathname: string) {
  return pathname === `/tab/${tabNumber}` || pathname === `/tab/${tabNumber}/`;
}

export function TopNav() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const { tabs, resolvePage, createPage, renamePage, removePage } = useCustomPages();
  const { themeId, themes, setThemeId } = useTheme();
  const currentTheme = getTheme(themeId);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const cancelRenameRef = useRef(false);
  const closingPageIdsRef = useRef(new Set<string>());
  const shareFeedbackTimeoutRef = useRef<number | null>(null);
  const isShareMountedRef = useRef(false);
  const hasWidgetSurface = WIDGET_SURFACE_PATTERNS.some((pattern) => pattern.test(pathname));
  const activeCustomPage = tabs.find((tab) =>
    isCustomRouteActive(tab.tabNumber, pathname),
  );

  useEffect(() => {
    const handleState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === 'boolean') {
        setIsAddMenuOpen(custom.detail.open);
      }
    };

    window.addEventListener(WIDGET_ADD_MENU_STATE_EVENT, handleState);
    return () => window.removeEventListener(WIDGET_ADD_MENU_STATE_EVENT, handleState);
  }, []);

  useEffect(() => {
    if (!hasWidgetSurface) {
      setIsAddMenuOpen(false);
      window.dispatchEvent(new Event(WIDGET_ADD_MENU_CLOSE_EVENT));
    }
  }, [hasWidgetSurface]);

  useEffect(() => {
    if (!renaming) return;
    const visibleInput = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-custom-page-rename]'),
    ).find((input) => input.getClientRects().length > 0);
    visibleInput?.focus();
    visibleInput?.select();
  }, [renaming?.id]);

  useEffect(() => {
    if (!isThemeMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsThemeMenuOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !themeMenuRef.current?.contains(target)) setIsThemeMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isThemeMenuOpen]);

  useEffect(() => {
    isShareMountedRef.current = true;
    return () => {
      isShareMountedRef.current = false;
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleAddMenu = () => {
    window.dispatchEvent(new Event(WIDGET_ADD_MENU_TOGGLE_EVENT));
  };

  const startRename = (tab: CustomPageTab) => {
    cancelRenameRef.current = false;
    setRenaming({ id: tab.id, value: tab.title });
  };


  const shareActiveCustomPage = async () => {
    if (!activeCustomPage) return;
    const resolution = resolvePage(String(activeCustomPage.tabNumber));
    if (resolution.status !== 'local') return;

    const shareUrl = buildCustomPageShareUrl(resolution.page, window.location.href);
    if (shareFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(shareFeedbackTimeoutRef.current);
      shareFeedbackTimeoutRef.current = null;
    }
    setIsShareCopied(false);

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(shareUrl);
      if (!isShareMountedRef.current) return;
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
      setIsShareCopied(true);
      shareFeedbackTimeoutRef.current = window.setTimeout(() => {
        shareFeedbackTimeoutRef.current = null;
        setIsShareCopied(false);
      }, 2_000);
    } catch {
      window.prompt('Copy this custom page link:', shareUrl);
    }
  };
  const commitRename = () => {
    if (!renaming) return;
    renamePage(renaming.id, renaming.value);
    setRenaming(null);
  };

  const closePage = async (pageId: string) => {
    if (closingPageIdsRef.current.has(pageId)) return;

    const activePage = tabs.find((tab) =>
      isCustomRouteActive(tab.tabNumber, pathname),
    );
    const isActive = activePage?.id === pageId;
    if (!isActive) {
      removePage(pageId);
      return;
    }

    closingPageIdsRef.current.add(pageId);
    const destination = getCustomPageCloseDestination(tabs, pageId);
    try {
      if (destination) {
        await navigate(buildCustomPageNavigation(destination.tabNumber, true));
      } else {
        await navigate({ to: '/', replace: true, resetScroll: false });
      }
      removePage(pageId);
    } finally {
      closingPageIdsRef.current.delete(pageId);
    }
  };

  const renderNavigationItems = (): ReactNode => (
    <>
      {navLinks.map((link) => {
        const isActive = isFixedRouteActive(link.href, pathname);
        return (
          <Link
            key={link.href}
            to={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'panel-header-interactive panel-header-meta h-full flex-none border-r border-[var(--surface-border-muted)]',
              isActive &&
                'bg-[var(--accent-subtle)] !text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]',
            )}
          >
            {link.label}
          </Link>
        );
      })}
      {tabs.map((tab) => {
        const isActive = isCustomRouteActive(tab.tabNumber, pathname);
        const isRenaming = renaming?.id === tab.id;
        const navigation = buildCustomPageNavigation(tab.tabNumber, false);
        return (
          <div
            key={tab.id}
            className={clsx(
              'relative h-full min-w-0 flex-none border-r border-[var(--surface-border-muted)]',
              isActive &&
                'bg-[var(--accent-subtle)] text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]',
            )}
          >
            {isRenaming ? (
              <input
                value={renaming.value}
                aria-label={`Rename ${tab.title}`}
                data-custom-page-rename=""
                className="min-w-24 max-w-48 bg-[var(--accent-subtle)] py-0 pl-3 pr-9 text-[10px] uppercase tracking-[0.18em] text-[var(--text-strong)] outline-2 -outline-offset-2 outline-[var(--accent)]"
                onChange={(event) =>
                  setRenaming({ id: tab.id, value: event.target.value })
                }
                onBlur={() => {
                  if (cancelRenameRef.current) {
                    cancelRenameRef.current = false;
                    return;
                  }
                  commitRename();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelRenameRef.current = true;
                    setRenaming(null);
                  }
                }}
              />
            ) : (
              <Link
                {...navigation}
                activeOptions={{ includeHash: false }}
                aria-current={isActive ? 'page' : undefined}
                title={tab.title}
                className="panel-header-interactive panel-header-meta h-full min-w-0 max-w-48 flex-none overflow-hidden !pl-3 !pr-9"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  startRename(tab);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'F2') {
                    event.preventDefault();
                    startRename(tab);
                  }
                }}
              >
                <span className="truncate">{tab.title}</span>
              </Link>
            )}
            <button
              type="button"
              aria-label={`Close ${tab.title}`}
              title={`Close ${tab.title}`}
              className="absolute right-[7px] top-1/2 z-10 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center !bg-transparent text-[rgb(var(--text-rgb)/0.55)] transition-colors hover:!bg-[rgb(var(--text-rgb)/0.08)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                closePage(tab.id);
              }}
            >
              <X className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New custom tab"
        title="New custom tab"
        className="panel-header-action flex-none !border-l-0 border-r border-[var(--surface-border-muted)]"
        onClick={() => {
          const page = createPage();
          navigate(buildCustomPageNavigation(page.tabNumber, false));
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );

  return (
    <header className="panel mx-[4px] mt-[4px] bg-[var(--surface)]">
      <div className="panel-header !grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] !border-b-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 self-stretch">
          <Link
            to="/"
            aria-label="618Lock home"
            aria-current={pathname === '/' ? 'page' : undefined}
            className={clsx(
              'panel-header-interactive panel-header-meta flex-none border-r border-[var(--surface-border-muted)] !px-4 font-semibold !tracking-[0.24em]',
              pathname === '/' &&
                'bg-[var(--accent-subtle)] !text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]',
            )}
          >
            <span className="text-[var(--text-strong)]">618</span>
            <span className="text-[var(--text-strong)]">Lock</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="scrollbar-hidden hidden min-w-0 flex-1 self-stretch overflow-x-auto lg:flex"
          >
            {renderNavigationItems()}
          </nav>
        </div>

        <div className="flex min-w-0 flex-1 justify-center self-stretch lg:w-auto lg:flex-none">
          <AccountSearchForm
            variant="header"
            placeholder="Search Steam players…"
            className="flex min-w-0 flex-1 self-stretch border-l border-[var(--surface-border-muted)] md:w-[clamp(15rem,24vw,22rem)] md:flex-none"
            onResolved={(accountId) => {
              navigate({
                to: '/players/$accountId',
                params: { accountId: String(accountId) },
              });
            }}
          />

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
                          <span
                            className="flex-1"
                            style={{ backgroundColor: theme.tokens['--background'] }}
                          />
                          <span
                            className="flex-1"
                            style={{ backgroundColor: theme.tokens['--surface'] }}
                          />
                          <span
                            className="flex-1"
                            style={{ backgroundColor: theme.tokens['--accent'] }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">{theme.label}</span>
                        {isSelected ? (
                          <Check className="h-4 w-4 flex-none" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          {activeCustomPage ? (
            <button
              type="button"
              onClick={() => void shareActiveCustomPage()}
              aria-label={isShareCopied ? 'Custom tab link copied' : 'Share custom tab'}
              title={isShareCopied ? 'Custom tab link copied' : 'Share custom tab'}
              className="panel-header-action"
            >
              {isShareCopied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className="scrollbar-hidden flex h-12 w-full overflow-x-auto border-t border-[var(--surface-border-muted)] lg:hidden"
      >
        {renderNavigationItems()}
      </nav>
    </header>
  );
}
