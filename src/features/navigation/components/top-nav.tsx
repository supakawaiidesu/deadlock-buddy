import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, LoaderCircle, Palette, Plus, Share2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { AccountSearchForm } from '@/features/player-search/components/account-search-form';
import { useCustomPages } from '@/features/custom-pages/custom-pages-provider';
import {
  buildCustomPageNavigation,
  buildCustomPageShareDocument,
  getCustomPageCloseDestination,
  type CustomPageTab,
} from '@/features/custom-pages/custom-page-state';
import { useCreateShare } from '@/features/custom-pages/api/queries';
import { getTheme } from '@/features/theme/theme';
import { useTheme } from '@/features/theme/theme-provider';
import {
  WIDGET_ADD_PICKER_CLOSE_EVENT,
  WIDGET_ADD_PICKER_STATE_EVENT,
  WIDGET_ADD_PICKER_TOGGLE_EVENT,
  WIDGET_PICKER_DIALOG_ID,
} from '@/features/widgets/widget-events';
import { ApiError } from '@/lib/api/client';
import { buildPublicShareUrl, normalizeShareName } from '@/lib/api/shares';
import { ZodError } from 'zod';

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
  const { tabs, createPage, renamePage, removePage, resolvePages } = useCustomPages();
  const createShareMutation = useCreateShare();
  const { themeId, themes, setThemeId } = useTheme();
  const currentTheme = getTheme(themeId);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(() => new Set());
  const [shareName, setShareName] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
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
        setIsAddPickerOpen(custom.detail.open);
      }
    };

    window.addEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);
    return () => window.removeEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);
  }, []);

  useEffect(() => {
    if (!hasWidgetSurface) {
      setIsAddPickerOpen(false);
      window.dispatchEvent(new Event(WIDGET_ADD_PICKER_CLOSE_EVENT));
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
    if (!isShareMenuOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsShareMenuOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !shareMenuRef.current?.contains(target)) setIsShareMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isShareMenuOpen]);

  useEffect(() => {
    setSelectedPageIds((selected) => {
      const existingIds = new Set(tabs.map((tab) => tab.id));
      return new Set(Array.from(selected).filter((id) => existingIds.has(id)));
    });
  }, [tabs]);

  useEffect(() => {
    isShareMountedRef.current = true;
    return () => {
      isShareMountedRef.current = false;
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleAddPicker = () => {
    window.dispatchEvent(new Event(WIDGET_ADD_PICKER_TOGGLE_EVENT));
  };

  const startRename = (tab: CustomPageTab) => {
    cancelRenameRef.current = false;
    setRenaming({ id: tab.id, value: tab.title });
  };

  const toggleShareMenu = () => {
    setIsThemeMenuOpen(false);
    setShareError(null);
    setIsShareMenuOpen((open) => {
      if (!open) {
        const initiallySelectedTabs = activeCustomPage ? [activeCustomPage] : tabs;
        setSelectedPageIds(new Set(initiallySelectedTabs.map((tab) => tab.id)));
        setShareName(initiallySelectedTabs[0]?.title ?? '');
        createShareMutation.reset();
      }
      return !open;
    });
  };

  const shareSelectedPages = async () => {
    if (createShareMutation.isPending) return;

    const normalizedName = normalizeShareName(shareName);
    if (normalizedName.length === 0) {
      setShareError('Enter a share name.');
      return;
    }
    if (Array.from(normalizedName).length > 80) {
      setShareError('Share name must be 80 characters or fewer.');
      return;
    }

    const pages = resolvePages(Array.from(selectedPageIds));
    if (pages.length === 0) return;
    setShareError(null);
    setIsShareCopied(false);

    let shareUrl: string;
    try {
      const result = await createShareMutation.mutateAsync(
        buildCustomPageShareDocument(normalizedName, pages),
      );
      shareUrl = buildPublicShareUrl(result.path, window.location.origin);
    } catch (error) {
      if (!isShareMountedRef.current) return;
      if (error instanceof ZodError) {
        setShareError('Selected tabs contain unsupported layout data.');
      } else if (error instanceof ApiError && error.status === 400) {
        setShareError('The selected tabs could not be shared.');
      } else if (error instanceof ApiError && error.status === 413) {
        setShareError('Selected tabs are too large to share.');
      } else if (error instanceof ApiError && error.status === 429) {
        setShareError('Too many shares. Try again shortly.');
      } else {
        setShareError('Unable to create a share right now. Try again.');
      }
      return;
    }

    if (shareFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(shareFeedbackTimeoutRef.current);
      shareFeedbackTimeoutRef.current = null;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt('Copy this custom tab link:', shareUrl);
    }
    if (!isShareMountedRef.current) return;
    setIsShareMenuOpen(false);
    setIsShareCopied(true);
    shareFeedbackTimeoutRef.current = window.setTimeout(() => {
      shareFeedbackTimeoutRef.current = null;
      setIsShareCopied(false);
    }, 2_000);
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
              'relative h-full min-w-0 max-w-48 flex-none border-r border-[var(--surface-border-muted)]',
              isActive &&
                'bg-[var(--accent-subtle)] text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]',
            )}
          >
            <Link
              {...navigation}
              activeOptions={{ includeHash: false }}
              aria-current={isActive ? 'page' : undefined}
              aria-hidden={isRenaming || undefined}
              tabIndex={isRenaming ? -1 : undefined}
              title={tab.title}
              className={clsx(
                'panel-header-interactive panel-header-meta h-full min-w-0 max-w-48 flex-none overflow-hidden !pl-3 !pr-9',
                isRenaming && 'pointer-events-none',
              )}
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
              <span className={clsx('truncate', isRenaming && 'invisible')}>
                {tab.title}
              </span>
            </Link>
            {isRenaming ? (
              <div className="pointer-events-none absolute left-3 right-9 top-1/2 flex min-w-0 -translate-y-1/2 justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--text-strong)]">
                <span className="relative inline-grid min-w-0 max-w-full items-center leading-[normal]">
                  <span
                    aria-hidden="true"
                    className="invisible col-start-1 row-start-1 max-w-full overflow-hidden whitespace-pre"
                  >
                    {renaming.value || ' '}
                  </span>
                  <input
                    value={renaming.value}
                    aria-label={`Rename ${tab.title}`}
                    data-custom-page-rename=""
                    className="pointer-events-auto col-start-1 row-start-1 min-w-0 w-full appearance-none border-0 bg-transparent bg-none p-0 font-inherit leading-[normal] text-inherit uppercase tracking-[inherit] shadow-none outline-none"
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
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-full mt-0.5 h-px bg-[var(--accent)]"
                  />
                </span>
              </div>
            ) : null}
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
              onClick={handleToggleAddPicker}
              aria-expanded={isAddPickerOpen}
              aria-haspopup="dialog"
              aria-controls={WIDGET_PICKER_DIALOG_ID}
              aria-label="Add widget"
              title="Add widget"
              className={clsx(
                'panel-header-action border-r border-[var(--surface-border-muted)]',
                isAddPickerOpen && 'bg-[var(--accent-muted)] !text-[var(--accent)]',
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
          <div ref={themeMenuRef} className="relative flex self-stretch">
            <button
              type="button"
              onClick={() => {
                setIsShareMenuOpen(false);
                setIsThemeMenuOpen((open) => !open);
              }}
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
          {tabs.length > 0 ? (
            <div ref={shareMenuRef} className="relative flex self-stretch">
              <button
                type="button"
                onClick={toggleShareMenu}
                aria-expanded={isShareMenuOpen}
                aria-haspopup="menu"
                aria-label={isShareCopied ? 'Custom tab links copied' : 'Share custom tabs'}
                title={isShareCopied ? 'Custom tab links copied' : 'Share custom tabs'}
                className={clsx(
                  'panel-header-action h-full',
                  isShareMenuOpen && 'bg-[var(--accent-muted)] !text-[var(--accent)]',
                )}
              >
                {isShareCopied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {isShareMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Share custom tabs"
                  className="absolute right-0 top-[calc(100%+4px)] z-[70] w-72 overflow-hidden rounded-sm border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm"
                >
                  <label className="block border-b border-[var(--surface-border-muted)] px-3 py-2.5">
                    <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--text-rgb)/0.5)]">
                      Share name
                    </span>
                    <input
                      type="text"
                      value={shareName}
                      disabled={createShareMutation.isPending}
                      onChange={(event) => {
                        setShareName(event.target.value);
                        setShareError(null);
                      }}
                      className="h-9 w-full rounded-sm border border-[var(--surface-border-muted)] bg-[var(--background)] px-2.5 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <span className="block border-b border-[var(--surface-border-muted)] px-3 py-2.5 text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--text-rgb)/0.5)]">
                    Select tabs
                  </span>
                  <div className="scroll-quiet max-h-72 overflow-y-auto">
                    {tabs.map((tab) => {
                      const isSelected = selectedPageIds.has(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={isSelected}
                          disabled={createShareMutation.isPending}
                          className={clsx(
                            'panel-header-interactive flex min-h-11 w-full items-stretch border-b border-[var(--surface-border-muted)] text-left text-[11px] uppercase tracking-[0.16em] transition',
                            isSelected
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                              : 'text-[rgb(var(--text-rgb)/0.75)]',
                          )}
                          onClick={() => {
                            setShareError(null);
                            setSelectedPageIds((selected) => {
                              const next = new Set(selected);
                              if (next.has(tab.id)) next.delete(tab.id);
                              else next.add(tab.id);
                              return next;
                            });
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className={clsx(
                              'flex w-11 flex-none items-center justify-center self-stretch border-r border-[var(--surface-border-muted)]',
                              isSelected
                                ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                                : 'text-transparent',
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="flex min-w-0 items-center px-3 py-2.5">
                            <span className="truncate">{tab.title}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {shareError ? (
                    <p
                      role="alert"
                      className="border-b border-[var(--surface-border-muted)] px-3 py-2.5 text-[11px] text-[var(--danger)]"
                    >
                      {shareError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={selectedPageIds.size === 0 || createShareMutation.isPending}
                    onClick={() => void shareSelectedPages()}
                    className="panel-header-interactive flex min-h-11 w-full items-center justify-center bg-[var(--accent-muted)] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] hover:!bg-[var(--accent)] hover:!text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {createShareMutation.isPending ? (
                      <>
                        <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Creating share…
                      </>
                    ) : (
                      'Share selected tabs'
                    )}
                  </button>
                </div>
              ) : null}
            </div>
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
