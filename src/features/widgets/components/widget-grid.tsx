import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DndContext,
  type DragMoveEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { WidgetInstance, WidgetRegistry } from '@/features/widgets/widget-types';
import {
  createWidgetInstanceId,
  sanitizeWidgetLayout,
} from '@/features/widgets/widget-layout';
import {
  GRID_GAP,
  GRID_ROW_HEIGHT,
  columnWidthPx,
  compactVertical,
  findFreeSlot,
  gridHeightPx,
  moveItem,
  rectToPixels,
  resizeItem,
} from '@/features/widgets/widget-engine';
import {
  WIDGET_ADD_MENU_CLOSE_EVENT,
  WIDGET_ADD_MENU_STATE_EVENT,
  WIDGET_ADD_MENU_TOGGLE_EVENT,
} from '@/features/widgets/widget-events';

type WidgetGridProps<TType extends string, TData> = {
  registry: WidgetRegistry<TType, TData>;
  defaultLayout: readonly WidgetInstance<TType>[];
  data: TData;
  storageKey: string;
  emptyStateTitle: string;
};

type ResizeAxis = 'x' | 'y' | 'xy';

type ResizeState<TType extends string> = {
  id: string;
  axis: ResizeAxis;
  startX: number;
  startY: number;
  startRect: WidgetInstance<TType>;
};

const ZERO_DELTA = { x: 0, y: 0 };

export function WidgetGrid<TType extends string, TData>({
  registry,
  defaultLayout,
  data,
  storageKey,
  emptyStateTitle,
}: WidgetGridProps<TType, TData>) {
  const [widgets, setWidgets] = useState<WidgetInstance<TType>[]>(() => [...defaultLayout]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [preview, setPreview] = useState<WidgetInstance<TType>[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState(ZERO_DELTA);
  const [resizeState, setResizeState] = useState<ResizeState<TType> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const validTypes = useMemo(() => new Set(Object.keys(registry)), [registry]);
  const availableWidgets = useMemo(
    () => Object.keys(registry).map((type) => registry[type as TType]),
    [registry],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setHasHydrated(true);
        return;
      }
      const parsed = JSON.parse(stored) as unknown;
      const layout = sanitizeWidgetLayout<TType>(
        parsed,
        validTypes,
        (type) => registry[type],
      );
      if (layout) {
        setWidgets(layout);
      }
    } catch (error) {
      console.warn('Failed to hydrate widget layout', error);
    } finally {
      setHasHydrated(true);
    }
  }, [registry, storageKey, validTypes]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(widgets));
  }, [hasHydrated, storageKey, widgets]);

  useEffect(() => {
    const handleToggle = () => {
      setIsAddMenuOpen((open) => !open);
    };
    const handleClose = () => setIsAddMenuOpen(false);

    window.addEventListener(WIDGET_ADD_MENU_TOGGLE_EVENT, handleToggle);
    window.addEventListener(WIDGET_ADD_MENU_CLOSE_EVENT, handleClose);

    return () => {
      window.removeEventListener(WIDGET_ADD_MENU_TOGGLE_EVENT, handleToggle);
      window.removeEventListener(WIDGET_ADD_MENU_CLOSE_EVENT, handleClose);
    };
  }, []);

  useEffect(() => {
    if (!isAddMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const menuNode = menuRef.current;
      if (menuNode && target && !menuNode.contains(target)) {
        setIsAddMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isAddMenuOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(WIDGET_ADD_MENU_STATE_EVENT, { detail: { open: isAddMenuOpen } }),
    );
  }, [isAddMenuOpen]);

  useLayoutEffect(() => {
    if (widgets.length === 0) return;

    const surface = surfaceRef.current;
    if (!surface) return;

    const updateWidth = () => {
      setContainerWidth(surface.getBoundingClientRect().width);
    };
    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      setContainerWidth(width ?? surface.getBoundingClientRect().width);
    });
    observer.observe(surface);

    return () => observer.disconnect();
  }, [isDesktop, widgets.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    if (!widgets.some((widget) => widget.id === id)) return;
    setActiveId(id);
    setDragDelta(ZERO_DELTA);
    setPreview(widgets);
  };

  const handleDragMove = ({ active, delta }: DragMoveEvent) => {
    const id = String(active.id);
    const origin = widgets.find((widget) => widget.id === id);
    setDragDelta(delta);
    if (!origin || containerWidth <= 0) return;

    const definition = registry[origin.type];
    const columnPitch = columnWidthPx(containerWidth) + GRID_GAP;
    if (columnPitch <= 0) return;

    const dx = Math.round(delta.x / columnPitch);
    const dy = Math.round(delta.y / (GRID_ROW_HEIGHT + GRID_GAP));
    setPreview(
      moveItem(
        widgets,
        id,
        { x: origin.x + dx, y: origin.y + dy },
        definition.minW,
        definition.minH,
      ),
    );
  };

  const finishInteraction = (commit: boolean) => {
    if (commit && preview) {
      setWidgets(preview);
    }
    setPreview(null);
    setActiveId(null);
    setDragDelta(ZERO_DELTA);
  };

  const handleDragEnd = () => finishInteraction(true);
  const handleDragCancel = () => finishInteraction(false);

  const handleRemove = (id: string) => {
    setWidgets((current) => compactVertical(current.filter((widget) => widget.id !== id)));
  };

  const handleAddWidget = (type: TType) => {
    const definition = registry[type];
    setWidgets((current) => {
      const slot = findFreeSlot(current, definition.defaultW, definition.defaultH);
      const next = {
        id: createWidgetInstanceId(type),
        type,
        ...slot,
        w: definition.defaultW,
        h: definition.defaultH,
      };
      return compactVertical([...current, next]);
    });
    setIsAddMenuOpen(false);
  };

  const handleResizeStart = (
    id: string,
    axis: ResizeAxis,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const startRect = widgets.find((widget) => widget.id === id);
    if (!isDesktop || !startRect) return;

    setResizeState({
      id,
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startRect: { ...startRect },
    });
    setPreview(widgets);
    setDragDelta(ZERO_DELTA);
  };

  const handleResizeMove = (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeState || resizeState.id !== id || containerWidth <= 0) return;

    const origin = widgets.find((widget) => widget.id === id);
    if (!origin) return;
    const definition = registry[origin.type];
    const columnPitch = columnWidthPx(containerWidth) + GRID_GAP;
    if (columnPitch <= 0) return;

    const dw = resizeState.axis.includes('x')
      ? Math.round((event.clientX - resizeState.startX) / columnPitch)
      : 0;
    const dh = resizeState.axis.includes('y')
      ? Math.round((event.clientY - resizeState.startY) / (GRID_ROW_HEIGHT + GRID_GAP))
      : 0;

    setPreview(
      resizeItem(
        widgets,
        id,
        { w: resizeState.startRect.w + dw, h: resizeState.startRect.h + dh },
        definition.minW,
        definition.minH,
      ),
    );
  };

  const handleResizeEnd = (id: string) => {
    if (!resizeState || resizeState.id !== id) return;
    if (preview) {
      setWidgets(preview);
    }
    setPreview(null);
    setResizeState(null);
  };

  const handleKeyboard = (
    instance: WidgetInstance<TType>,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!isDesktop) return;

    const move = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    }[event.key];
    if (!move) return;

    const definition = registry[instance.type];
    const next = event.shiftKey
      ? resizeItem(
          widgets,
          instance.id,
          {
            w: instance.w + (move.x === 0 ? 0 : move.x),
            h: instance.h + (move.y === 0 ? 0 : move.y),
          },
          definition.minW,
          definition.minH,
        )
      : moveItem(
          widgets,
          instance.id,
          { x: instance.x + move.x, y: instance.y + move.y },
          definition.minW,
          definition.minH,
        );

    event.preventDefault();
    setWidgets(next);
  };

  const displayed = preview ?? widgets;
  const mobileWidgets = useMemo(
    () =>
      [...displayed].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      }),
    [displayed],
  );
  const showEmptyState = widgets.length === 0;

  const renderCell = (instance: WidgetInstance<TType>, positioned: boolean) => {
    const previewRect = displayed.find((item) => item.id === instance.id) ?? instance;
    const originRect =
      activeId === instance.id
        ? widgets.find((item) => item.id === instance.id) ?? previewRect
        : previewRect;

    return (
      <WidgetCell
        key={instance.id}
        instance={instance}
        data={data}
        registry={registry}
        positioned={positioned}
        containerWidth={containerWidth}
        renderRect={originRect}
        isActive={activeId === instance.id || resizeState?.id === instance.id}
        isDragging={activeId === instance.id}
        dragDelta={activeId === instance.id ? dragDelta : ZERO_DELTA}
        isDesktop={isDesktop}
        onRemove={handleRemove}
        onResizeStart={handleResizeStart}
        onResizeMove={handleResizeMove}
        onResizeEnd={handleResizeEnd}
        onKeyboard={handleKeyboard}
      />
    );
  };

  return (
    <>
      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.12)] bg-[rgb(var(--text-rgb)/0.03)] px-6 py-16 text-center text-[13px] text-[rgb(var(--text-rgb)/0.6)]">
          <p>{emptyStateTitle}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.45)]">
            Use &ldquo;Add widget&rdquo; to bring metrics back.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {isDesktop ? (
            <div
              ref={surfaceRef}
              className="relative w-full"
              style={{ height: gridHeightPx(displayed) }}
            >
              {containerWidth > 0 ? (
                <>
                  {activeId && preview ? (
                    <div
                      className="pointer-events-none absolute rounded-[2px] border border-dashed border-[var(--accent)] bg-[var(--accent-subtle)]"
                      style={(() => {
                        const target = displayed.find((item) => item.id === activeId);
                        if (!target) return undefined;
                        const pixels = rectToPixels(target, containerWidth);
                        return {
                          width: pixels.width,
                          height: pixels.height,
                          transform: `translate3d(${pixels.left}px, ${pixels.top}px, 0)`,
                        };
                      })()}
                    />
                  ) : null}
                  {displayed.map((instance) => renderCell(instance, true))}
                </>
              ) : null}
            </div>
          ) : (
            <div ref={surfaceRef} className="flex flex-col gap-[4px]">
              {mobileWidgets.map((instance) => renderCell(instance, false))}
            </div>
          )}
        </DndContext>
      )}
      {isAddMenuOpen ? (
        <div
          ref={menuRef}
          className="fixed right-8 top-[76px] z-[60] w-56 rounded-sm border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] p-2 shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm"
        >
          <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--text-rgb)/0.5)]">
            Panel types
          </span>
          <ul className="flex flex-col gap-1 text-left">
            {availableWidgets.map((widget) => (
              <li key={widget.type}>
                <button
                  type="button"
                  onClick={() => handleAddWidget(widget.type)}
                  className="w-full rounded-sm border border-transparent px-2 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--text-rgb)/0.75)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)]"
                >
                  {widget.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

type WidgetCellProps<TType extends string, TData> = {
  instance: WidgetInstance<TType>;
  data: TData;
  registry: WidgetRegistry<TType, TData>;
  positioned: boolean;
  containerWidth: number;
  renderRect: WidgetInstance<TType>;
  isActive: boolean;
  isDragging: boolean;
  dragDelta: { x: number; y: number };
  isDesktop: boolean;
  onRemove: (id: string) => void;
  onResizeStart: (
    id: string,
    axis: ResizeAxis,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onResizeMove: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onResizeEnd: (id: string) => void;
  onKeyboard: (
    instance: WidgetInstance<TType>,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => void;
};

function WidgetCell<TType extends string, TData>({
  instance,
  data,
  registry,
  positioned,
  containerWidth,
  renderRect,
  isActive,
  isDragging,
  dragDelta,
  isDesktop,
  onRemove,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onKeyboard,
}: WidgetCellProps<TType, TData>) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: instance.id,
    disabled: !isDesktop,
  });
  const definition = registry[instance.type];
  const pixelRect = positioned ? rectToPixels(renderRect, containerWidth) : null;
  const style: CSSProperties | undefined = pixelRect
    ? {
        position: 'absolute',
        left: 0,
        top: 0,
        width: pixelRect.width,
        height: pixelRect.height,
        transform: `translate3d(${pixelRect.left + dragDelta.x}px, ${pixelRect.top + dragDelta.y}px, 0)`,
        transition: isActive
          ? 'none'
          : 'transform 180ms ease, width 180ms ease, height 180ms ease',
        zIndex: isActive ? 30 : undefined,
      }
    : undefined;

  const handlePointerDown = (
    axis: ResizeAxis,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onResizeStart(instance.id, axis, event);
  };

  const headerActions = (
    <>
      <button
        type="button"
        {...(isDesktop ? attributes : {})}
        {...(isDesktop ? listeners : {})}
        onKeyDown={(event) => onKeyboard(instance, event)}
        disabled={!isDesktop}
        className={clsx(
          'panel-header-action touch-none cursor-grab',
          isDragging ? 'cursor-grabbing bg-[var(--accent-muted)] text-[var(--accent)]' : '',
        )}
        aria-label="Move panel (arrow keys move, shift+arrow resizes)"
        title="Move panel (arrow keys move, shift+arrow resizes)"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="3" cy="3" r="0.8" fill="currentColor" />
          <circle cx="9" cy="3" r="0.8" fill="currentColor" />
          <circle cx="3" cy="6" r="0.8" fill="currentColor" />
          <circle cx="9" cy="6" r="0.8" fill="currentColor" />
          <circle cx="3" cy="9" r="0.8" fill="currentColor" />
          <circle cx="9" cy="9" r="0.8" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onRemove(instance.id)}
        className="panel-header-action relative z-10"
        aria-label="Hide panel"
        title="Hide panel"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );

  const content = definition.render({
    instance,
    data,
    headerActions,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative min-w-0',
        isActive ? 'shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]' : 'shadow-none',
      )}
    >
      {content}
      {isDesktop ? (
        <>
          <button
            type="button"
            aria-label="Resize panel width"
            title="Resize panel width"
            className="absolute right-0 top-0 z-20 h-full w-[6px] touch-none border-0 bg-transparent p-0"
            onPointerDown={(event) => handlePointerDown('x', event)}
            onPointerMove={(event) => onResizeMove(instance.id, event)}
            onPointerUp={(event) => {
              onResizeEnd(instance.id);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onLostPointerCapture={() => onResizeEnd(instance.id)}
          />
          <button
            type="button"
            aria-label="Resize panel height"
            title="Resize panel height"
            className="absolute bottom-0 left-0 z-20 h-[6px] w-full touch-none border-0 bg-transparent p-0"
            onPointerDown={(event) => handlePointerDown('y', event)}
            onPointerMove={(event) => onResizeMove(instance.id, event)}
            onPointerUp={(event) => {
              onResizeEnd(instance.id);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onLostPointerCapture={() => onResizeEnd(instance.id)}
          />
          <button
            type="button"
            aria-label="Resize panel width and height"
            title="Resize panel width and height"
            className="absolute bottom-0 right-0 z-20 h-[14px] w-[14px] touch-none border-0 bg-transparent p-0"
            onPointerDown={(event) => handlePointerDown('xy', event)}
            onPointerMove={(event) => onResizeMove(instance.id, event)}
            onPointerUp={(event) => {
              onResizeEnd(instance.id);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onLostPointerCapture={() => onResizeEnd(instance.id)}
          >
            <span
              className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              aria-hidden="true"
            >
              <span className="absolute bottom-[2px] right-[2px] h-px w-3 origin-right -rotate-45 bg-[rgb(var(--text-rgb)/0.3)]" />
              <span className="absolute bottom-[2px] right-[2px] h-px w-3 origin-right rotate-[-135deg] bg-[rgb(var(--text-rgb)/0.3)]" />
            </span>
          </button>
        </>
      ) : null}
    </div>
  );
}
