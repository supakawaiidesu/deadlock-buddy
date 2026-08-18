import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { WIDGET_PICKER_DIALOG_ID } from '@/features/widgets/widget-events';

export type WidgetPickerOption<TType extends string> = {
  type: TType;
  title: string;
  description: string;
  preview: ReactNode;
};

type WidgetPickerProps<TType extends string> = {
  options: readonly WidgetPickerOption<TType>[];
  onSelect: (type: TType) => void;
  onClose: () => void;
};


export function WidgetPicker<TType extends string>({
  options,
  onSelect,
  onClose,
}: WidgetPickerProps<TType>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activePreview, setActivePreview] = useState<{
    option: WidgetPickerOption<TType>;
    anchor: DOMRect;
  } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    searchInputRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onCloseRef.current();
  };

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = normalizedQuery.length === 0
    ? options
    : options.filter((option) => option.title.toLocaleLowerCase().includes(normalizedQuery));
  const visiblePreview = activePreview && filteredOptions.some(
    (option) => option.type === activePreview.option.type,
  ) ? activePreview : null;
  let flyoutStyle: CSSProperties | undefined;
  let connectorStyle: CSSProperties | undefined;
  let flyoutSide: 'left' | 'right' = 'right';
  if (visiblePreview) {
    const viewportMargin = 16;
    const desiredWidth = 320;
    const flyoutHeight = 152;
    const spaceRight = window.innerWidth - visiblePreview.anchor.right - viewportMargin;
    const spaceLeft = visiblePreview.anchor.left - viewportMargin;
    flyoutSide = spaceRight >= 192 || spaceRight >= spaceLeft ? 'right' : 'left';
    const availableWidth = Math.max(
      0,
      flyoutSide === 'right' ? spaceRight : spaceLeft,
    );
    const width = Math.min(desiredWidth, availableWidth);
    const maxTop = Math.max(viewportMargin, window.innerHeight - flyoutHeight - viewportMargin);
    const desiredTop = visiblePreview.anchor.top - 1;
    const top = Math.min(Math.max(desiredTop, viewportMargin), maxTop);
    const connectorTop = Math.min(
      flyoutHeight,
      Math.max(0, visiblePreview.anchor.top - top - 1),
    );
    const connectorBottom = Math.max(
      connectorTop,
      Math.min(flyoutHeight, visiblePreview.anchor.bottom - top - 2),
    );
    flyoutStyle = {
      top,
      left: flyoutSide === 'right'
        ? visiblePreview.anchor.right
        : visiblePreview.anchor.left - width,
      width,
    };
    connectorStyle = {
      top: connectorTop,
      height: Math.max(0, connectorBottom - connectorTop),
    };
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      id={WIDGET_PICKER_DIALOG_ID}
      className="widget-picker-dialog"
      aria-modal="true"
      aria-label="Add a widget"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section className="panel w-[min(20rem,calc(100vw-2rem))] overflow-hidden bg-[var(--overlay-background)] !p-0">
        <header className="panel-header h-12">
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[rgb(var(--text-rgb)/0.45)]">
            <span className="sr-only">Search widgets</span>
            <Search className="h-4 w-4 flex-none" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setActivePreview(null);
              }}
              placeholder="Search widgets…"
              aria-label="Search widgets"
              role="searchbox"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--foreground)] caret-[var(--accent)] outline-none placeholder:text-[rgb(var(--text-rgb)/0.35)]"
            />
          </label>
          <button
            type="button"
            aria-label="Close widget picker"
            className="panel-header-action"
            onClick={requestClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div
          className="scroll-quiet max-h-[min(31.5rem,calc(100dvh-5rem))] overflow-y-auto"
          onScroll={() => setActivePreview(null)}
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option) => {
            const isPreviewVisible = visiblePreview?.option.type === option.type;
            return (
              <button
                key={option.type}
                type="button"
                aria-describedby={isPreviewVisible ? 'widget-picker-option-preview' : undefined}
                data-preview-visible={isPreviewVisible}
                className="panel-header-interactive widget-picker-option flex h-11 w-full min-w-0 items-center border-b border-[var(--surface-border-muted)] px-3 text-left last:border-b-0"
                onMouseEnter={(event) => {
                  setActivePreview({ option, anchor: event.currentTarget.getBoundingClientRect() });
                }}
                onMouseLeave={() => setActivePreview(null)}
                onFocus={(event) => {
                  setActivePreview({ option, anchor: event.currentTarget.getBoundingClientRect() });
                }}
                onBlur={() => setActivePreview(null)}
                onClick={() => onSelect(option.type)}
              >
                <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-[rgb(var(--text-rgb)/0.72)]">
                  {option.title}
                </span>
              </button>
            );
          }) : (
            <p className="flex h-28 items-center justify-center px-6 text-center text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--text-rgb)/0.5)]" role="status">
              No widgets match “{query.trim()}”
            </p>
          )}
        </div>
      </section>
      {visiblePreview ? (
        <aside
          id="widget-picker-option-preview"
          role="tooltip"
          className="widget-picker-preview pointer-events-none fixed z-[80] hidden h-[9.5rem] flex-col border border-[var(--surface-border-muted)] md:flex"
          style={flyoutStyle}
        >
          <div className="h-28 shrink-0 overflow-hidden" aria-hidden="true">
            {visiblePreview.option.preview}
          </div>
          <p className="min-h-0 flex-1 truncate border-t border-[var(--surface-border-muted)] px-3 py-2.5 text-[10px] text-[rgb(var(--text-rgb)/0.62)]">
            {visiblePreview.option.description}
          </p>
          <span
            aria-hidden="true"
            className={`absolute z-10 w-[2px] [background-color:inherit] ${
              flyoutSide === 'right' ? '-left-px' : '-right-px'
            }`}
            style={connectorStyle}
          />
        </aside>
      ) : null}
    </dialog>,
    document.body,
  );
}
