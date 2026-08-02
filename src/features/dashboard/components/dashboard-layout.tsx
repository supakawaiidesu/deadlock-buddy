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
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type {
  DashboardDataBundle,
  DashboardPanelInstance,
  DashboardPanelType,
} from '@/features/dashboard/dashboard-types';
import {
  dashboardPanelRegistry,
  dashboardPanelsList,
  defaultDashboardLayout,
} from '@/features/dashboard/dashboard-panel-registry';

type DashboardLayoutProps = {
  data: DashboardDataBundle;
};

const STORAGE_KEY = 'deadlock-buddy-dashboard-layout.v1';
const ADD_MENU_TOGGLE_EVENT = 'dashboard:add-panel-menu-toggle';
const ADD_MENU_CLOSE_EVENT = 'dashboard:add-panel-menu-close';
const ADD_MENU_STATE_EVENT = 'dashboard:add-panel-menu-state';

function createInstanceId(type: DashboardPanelType): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${type}-${crypto.randomUUID()}`;
  }
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeLayout(raw: unknown): DashboardPanelInstance[] | null {
  if (!Array.isArray(raw)) return null;
  const validTypes = new Set(Object.keys(dashboardPanelRegistry) as DashboardPanelType[]);

  const cleaned: DashboardPanelInstance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, type } = item as Partial<DashboardPanelInstance>;
    if (typeof id !== 'string' || typeof type !== 'string') continue;
    if (!validTypes.has(type as DashboardPanelType)) continue;
    cleaned.push({ id, type: type as DashboardPanelType });
  }

  if (cleaned.length === 0) return null;
  return cleaned;
}

export function DashboardLayout({ data }: DashboardLayoutProps) {
  const [panels, setPanels] = useState<DashboardPanelInstance[]>(defaultDashboardLayout);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setHasHydrated(true);
        return;
      }
      const parsed = JSON.parse(stored) as unknown;
      const layout = sanitizeLayout(parsed);
      if (layout) {
        setPanels(layout);
      }
    } catch (error) {
      console.warn('Failed to hydrate dashboard layout', error);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels, hasHydrated]);

  useEffect(() => {
    const handleToggle = () => {
      setIsAddMenuOpen((open) => !open);
    };
    const handleClose = () => setIsAddMenuOpen(false);

    window.addEventListener(ADD_MENU_TOGGLE_EVENT, handleToggle);
    window.addEventListener(ADD_MENU_CLOSE_EVENT, handleClose);

    return () => {
      window.removeEventListener(ADD_MENU_TOGGLE_EVENT, handleToggle);
      window.removeEventListener(ADD_MENU_CLOSE_EVENT, handleClose);
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
      new CustomEvent(ADD_MENU_STATE_EVENT, { detail: { open: isAddMenuOpen } }),
    );
  }, [isAddMenuOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setPanels((current) => {
      const oldIndex = current.findIndex((panel) => panel.id === active.id);
      const newIndex = current.findIndex((panel) => panel.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleRemove = (id: string) => {
    setPanels((current) => current.filter((panel) => panel.id !== id));
  };

  const handleAddPanel = (type: DashboardPanelType) => {
    setPanels((current) => [...current, { id: createInstanceId(type), type }]);
    setIsAddMenuOpen(false);
  };

  const availablePanels = useMemo(() => dashboardPanelsList, []);

  const showEmptyState = panels.length === 0;

  return (
    <>
      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-[rgba(245,247,245,0.12)] bg-[rgba(245,247,245,0.03)] px-6 py-16 text-center text-[13px] text-[rgba(245,247,245,0.6)]">
          <p>Nothing on the dashboard yet.</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(245,247,245,0.45)]">
            Use &ldquo;Add panel&rdquo; to bring metrics back.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={panels.map((panel) => panel.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-[2px] lg:grid-cols-3">
              {panels.map((instance) => (
                <SortablePanel
                  key={instance.id}
                  instance={instance}
                  data={data}
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
          className="fixed right-8 top-[76px] z-[60] w-56 rounded-sm border border-[rgba(245,247,245,0.16)] bg-[rgba(8,12,11,0.97)] p-2 shadow-lg shadow-[rgba(0,0,0,0.35)] backdrop-blur-sm"
        >
          <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[rgba(245,247,245,0.5)]">
            Panel types
          </span>
          <ul className="flex flex-col gap-1 text-left">
            {availablePanels.map((panel) => (
              <li key={panel.type}>
                <button
                  type="button"
                  onClick={() => handleAddPanel(panel.type)}
                  className="w-full rounded-sm border border-transparent px-2 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-[rgba(245,247,245,0.75)] transition hover:border-[var(--accent)] hover:text-white"
                >
                  {panel.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

type SortablePanelProps = {
  instance: DashboardPanelInstance;
  data: DashboardDataBundle;
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

function SortablePanel({ instance, data, onRemove }: SortablePanelProps) {
  const definition = dashboardPanelRegistry[instance.type];
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
        'group relative',
        getColumnSpanClass(definition.columnSpan),
        isDragging ? 'scale-[1.01] shadow-lg shadow-[rgba(0,0,0,0.35)]' : 'shadow-none',
      )}
    >
      {content}
    </div>
  );
}
