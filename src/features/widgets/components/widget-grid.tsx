import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
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

type WidgetGridLayoutOwner<TType extends string> =
  | {
      storageKey: string;
      defaultLayout: readonly WidgetInstance<TType>[];
      initialLayout?: never;
      onLayoutCommit?: never;
    }
  | {
      initialLayout: readonly WidgetInstance<TType>[];
      onLayoutCommit: (next: WidgetInstance<TType>[]) => void;
      storageKey?: never;
      defaultLayout?: never;
    };

type WidgetGridSharedProps<TType extends string, TData> = {
  registry: WidgetRegistry<TType, TData>;
  emptyStateTitle: string;
  emptyStateHint?: string | null;
  useGridHeightOnMobile?: boolean;
} & WidgetGridLayoutOwner<TType>;

type WidgetGridProps<TType extends string, TData> = WidgetGridSharedProps<TType, TData> &
  (
    | {
        data: TData;
        isLoading?: false;
        renderLoading?: never;
      }
    | {
        data?: never;
        isLoading: true;
        renderLoading: (
          instance: WidgetInstance<TType>,
          headerActions: ReactNode,
        ) => ReactNode;
      }
  );

type ResizeAxis = 'x' | 'y' | 'xy';

type ResizeState<TType extends string> = {
  id: string;
  axis: ResizeAxis;
  startX: number;
  startY: number;
  startRect: WidgetInstance<TType>;
};


export function WidgetGrid<TType extends string, TData>(
  props: WidgetGridProps<TType, TData>,
) {
  const {
    registry,
    emptyStateTitle,
    emptyStateHint = 'Use “Add widget” to bring metrics back.',
    useGridHeightOnMobile = false,
  } = props;
  const [widgets, setWidgets] = useState<WidgetInstance<TType>[]>(() => {
    if (props.initialLayout !== undefined) return [...props.initialLayout];
    try {
      const stored = window.localStorage.getItem(props.storageKey);
      if (!stored) return [...props.defaultLayout];

      const parsed = JSON.parse(stored) as unknown;
      return (
        sanitizeWidgetLayout<TType>(
          parsed,
          new Set(Object.keys(registry)),
          (type) => registry[type],
        ) ?? [...props.defaultLayout]
      );
    } catch (error) {
      console.warn('Failed to hydrate widget layout', error);
      return [...props.defaultLayout];
    }
  });
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [preview, setPreview] = useState<WidgetInstance<TType>[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState<TType> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );
  const menuRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const hasPersistedLayoutRef = useRef(false);
  const resizeCommittedRef = useRef(false);
  const snappedDragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const availableWidgets = useMemo(
    () => Object.keys(registry).map((type) => registry[type as TType]),
    [registry],
  );

  useEffect(() => {
    if (!hasPersistedLayoutRef.current) {
      hasPersistedLayoutRef.current = true;
      return;
    }
    if (props.storageKey !== undefined) {
      try {
        window.localStorage.setItem(props.storageKey, JSON.stringify(widgets));
      } catch (error) {
        console.warn('Failed to persist widget layout', error);
      }
    } else {
      props.onLayoutCommit(widgets);
    }
  }, [props.onLayoutCommit, props.storageKey, widgets]);

  const commitLayout = (next: WidgetInstance<TType>[]) => {
    setWidgets(next);
  };

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
    snappedDragRef.current = { id, dx: 0, dy: 0 };
    setActiveId(id);
    setPreview(widgets);
  };

  const handleDragMove = ({ active, delta }: DragMoveEvent) => {
    const id = String(active.id);
    const origin = widgets.find((widget) => widget.id === id);
    if (!origin || containerWidth <= 0) return;

    const definition = registry[origin.type];
    const columnPitch = columnWidthPx(containerWidth) + GRID_GAP;
    if (columnPitch <= 0) return;

    const dx = Math.round(delta.x / columnPitch);
    const dy = Math.round(delta.y / (GRID_ROW_HEIGHT + GRID_GAP));
    const snapped = snappedDragRef.current;
    if (snapped?.id === id && snapped.dx === dx && snapped.dy === dy) return;
    snappedDragRef.current = { id, dx, dy };
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
    if (commit && preview) commitLayout(preview);
    snappedDragRef.current = null;
    setPreview(null);
    setActiveId(null);
  };

  const handleDragEnd = () => finishInteraction(true);
  const handleDragCancel = () => finishInteraction(false);

  const handleRemove = (id: string) => {
    commitLayout(compactVertical(widgets.filter((widget) => widget.id !== id)));
  };

  const handleAddWidget = (type: TType) => {
    const definition = registry[type];
    const slot = findFreeSlot(widgets, definition.defaultW, definition.defaultH);
    const next = {
      id: createWidgetInstanceId(type),
      type,
      ...slot,
      w: definition.defaultW,
      h: definition.defaultH,
    };
    commitLayout(compactVertical([...widgets, next]));
    setIsAddMenuOpen(false);
  };

  const handleResizeStart = (
    id: string,
    axis: ResizeAxis,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const startRect = widgets.find((widget) => widget.id === id);
    if (!isDesktop || !startRect) return;
    resizeCommittedRef.current = false;

    setResizeState({
      id,
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startRect: { ...startRect },
    });
    setPreview(widgets);
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
    const width = resizeState.startRect.w + dw;
    const height = resizeState.startRect.h + dh;
    const currentPreview = preview?.find((widget) => widget.id === id);
    if (currentPreview?.w === width && currentPreview.h === height) return;

    setPreview(
      resizeItem(
        widgets,
        id,
        { w: width, h: height },
        definition.minW,
        definition.minH,
      ),
    );
  };

  const handleResizeEnd = (id: string) => {
    if (
      resizeCommittedRef.current ||
      !resizeState ||
      resizeState.id !== id
    ) {
      return;
    }
    resizeCommittedRef.current = true;
    if (preview) commitLayout(preview);
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
    commitLayout(next);
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

  const committedWidgetsById = new Map(
    widgets.map((widget) => [widget.id, widget] as const),
  );
  const displayedWidgetsById = new Map(
    displayed.map((widget) => [widget.id, widget] as const),
  );

  const renderCell = (instance: WidgetInstance<TType>, positioned: boolean) => {
    const committedInstance = committedWidgetsById.get(instance.id) ?? instance;
    const previewRect = displayedWidgetsById.get(instance.id) ?? instance;
    const originRect =
      activeId === instance.id ? committedInstance : previewRect;

    const modeProps = props.isLoading
      ? {
          isLoading: true as const,
          renderLoading: props.renderLoading,
        }
      : {
          data: props.data as TData,
        };

    return (
      <WidgetCell<TType, TData>
        key={instance.id}
        instance={committedInstance}
        registry={registry}
        positioned={positioned}
        containerWidth={containerWidth}
        renderRect={originRect}
        isActive={activeId === instance.id || resizeState?.id === instance.id}
        isDragging={activeId === instance.id}
        isDesktop={isDesktop}
        useGridHeightOnMobile={useGridHeightOnMobile}
        onRemove={handleRemove}
        onResizeStart={handleResizeStart}
        onResizeMove={handleResizeMove}
        onResizeEnd={handleResizeEnd}
        onKeyboard={handleKeyboard}
        {...modeProps}
      />
    );
  };

  return (
    <>
      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-[rgb(var(--text-rgb)/0.12)] bg-[rgb(var(--text-rgb)/0.03)] px-6 py-16 text-center text-[13px] text-[rgb(var(--text-rgb)/0.6)]">
          <p>{emptyStateTitle}</p>
          {emptyStateHint ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[rgb(var(--text-rgb)/0.45)]">
              {emptyStateHint}
            </p>
          ) : null}
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
          className="fixed right-8 top-[124px] z-[60] w-56 rounded-sm border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] p-2 shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm lg:top-[76px]"
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

type WidgetCellSharedProps<TType extends string, TData> = {
  instance: WidgetInstance<TType>;
  registry: WidgetRegistry<TType, TData>;
  positioned: boolean;
  containerWidth: number;
  renderRect: WidgetInstance<TType>;
  isActive: boolean;
  isDragging: boolean;
  isDesktop: boolean;
  useGridHeightOnMobile: boolean;
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

type WidgetCellProps<TType extends string, TData> = WidgetCellSharedProps<TType, TData> &
  (
    | {
        data: TData;
        isLoading?: false;
        renderLoading?: never;
      }
    | {
        data?: never;
        isLoading: true;
        renderLoading: (
          instance: WidgetInstance<TType>,
          headerActions: ReactNode,
        ) => ReactNode;
      }
  );

function WidgetCell<TType extends string, TData>(props: WidgetCellProps<TType, TData>) {
  const {
    instance,
    registry,
    positioned,
    containerWidth,
    renderRect,
    isActive,
    isDragging,
    isDesktop,
    useGridHeightOnMobile,
    onRemove,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
    onKeyboard,
  } = props;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: instance.id,
    disabled: !isDesktop,
  });
  const definition = registry[instance.type];
  const pixelRect = positioned ? rectToPixels(renderRect, containerWidth) : null;
  const dragX = isDragging ? (transform?.x ?? 0) : 0;
  const dragY = isDragging ? (transform?.y ?? 0) : 0;
  const style: CSSProperties | undefined = pixelRect
    ? {
        position: 'absolute',
        left: 0,
        top: 0,
        width: pixelRect.width,
        height: pixelRect.height,
        transform: `translate3d(${pixelRect.left + dragX}px, ${pixelRect.top + dragY}px, 0)`,
        transition: isActive
          ? 'none'
          : 'transform 180ms ease, width 180ms ease, height 180ms ease',
        zIndex: isActive ? 30 : undefined,
      }
    : useGridHeightOnMobile && !positioned
      ? { height: instance.h * GRID_ROW_HEIGHT + (instance.h - 1) * GRID_GAP }
      : undefined;

  const handlePointerDown = (
    axis: ResizeAxis,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onResizeStart(instance.id, axis, event);
  };

  const headerActions = useMemo(
    () => (
      <>
        <button
          type="button"
          {...(isDesktop ? attributes : {})}
          {...(isDesktop ? listeners : {})}
          onKeyDown={(event) => onKeyboard(instance, event)}
          disabled={!isDesktop}
          className={clsx(
            'panel-header-action touch-none cursor-grab',
            isDragging
              ? 'cursor-grabbing bg-[var(--accent-muted)] text-[var(--accent)]'
              : '',
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
    ),
    [attributes, instance, isDesktop, isDragging, listeners, onKeyboard, onRemove],
  );

  const content = useMemo(
    () =>
      props.isLoading
        ? props.renderLoading(instance, headerActions)
        : definition.render({
            instance,
            data: props.data,
            headerActions,
          }),
    [definition, headerActions, instance, props.data, props.isLoading, props.renderLoading],
  );

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
