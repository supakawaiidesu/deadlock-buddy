import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { WidgetInstance, WidgetRegistry } from '@/features/widgets/widget-types';
import {
  createWidgetInstanceId,
  sanitizeWidgetLayout,
} from '@/features/widgets/widget-layout';
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
  className?: string;
};

export function WidgetGrid<TType extends string, TData>({
  registry,
  defaultLayout,
  data,
  storageKey,
  emptyStateTitle,
  className,
}: WidgetGridProps<TType, TData>) {
  const [widgets, setWidgets] = useState<WidgetInstance<TType>[]>(() => [...defaultLayout]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
      const layout = sanitizeWidgetLayout<TType>(parsed, validTypes);
      if (layout) {
        setWidgets(layout);
      }
    } catch (error) {
      console.warn('Failed to hydrate widget layout', error);
    } finally {
      setHasHydrated(true);
    }
  }, [storageKey, validTypes]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setWidgets((current) => {
      const oldIndex = current.findIndex((widget) => widget.id === active.id);
      const newIndex = current.findIndex((widget) => widget.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleRemove = (id: string) => {
    setWidgets((current) => current.filter((widget) => widget.id !== id));
  };

  const handleAddWidget = (type: TType) => {
    setWidgets((current) => [...current, { id: createWidgetInstanceId(type), type }]);
    setIsAddMenuOpen(false);
  };

  const showEmptyState = widgets.length === 0;

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
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
            <div className={clsx('grid gap-[4px] lg:grid-cols-3', className)}>
              {widgets.map((instance) => (
                <SortableWidget
                  key={instance.id}
                  instance={instance}
                  data={data}
                  registry={registry}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
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

type SortableWidgetProps<TType extends string, TData> = {
  instance: WidgetInstance<TType>;
  data: TData;
  registry: WidgetRegistry<TType, TData>;
  onRemove: (id: string) => void;
};

const COLUMN_SPAN_CLASSES: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
};

function getColumnSpanClass(span?: number) {
  if (!span) return COLUMN_SPAN_CLASSES[1];
  return COLUMN_SPAN_CLASSES[span] ?? COLUMN_SPAN_CLASSES[1];
}

function SortableWidget<TType extends string, TData>({
  instance,
  data,
  registry,
  onRemove,
}: SortableWidgetProps<TType, TData>) {
  const definition = registry[instance.type];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const headerActions = (
    <>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={clsx(
          'panel-header-action touch-none cursor-grab',
          isDragging ? 'cursor-grabbing bg-[var(--accent-muted)] text-[var(--accent)]' : '',
        )}
        aria-label="Move panel"
        title="Move panel"
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
        getColumnSpanClass(definition.columnSpan),
        isDragging ? 'scale-[1.01] shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)]' : 'shadow-none',
      )}
    >
      {content}
    </div>
  );
}
