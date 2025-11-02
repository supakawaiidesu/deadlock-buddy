'use client';

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
    if (typeof window === 'undefined') return undefined;

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
    if (typeof window === 'undefined') return;
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
    <button
      type="button"
      onClick={() => onRemove(instance.id)}
      className="flex h-6 w-6 items-center justify-center rounded-sm border border-transparent text-[rgba(245,247,245,0.55)] transition hover:text-white focus-visible:text-white"
      aria-label="Hide panel"
    >
      <span aria-hidden="true">&times;</span>
    </button>
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
        isDragging ? 'scale-[1.01] shadow-lg shadow-[rgba(0,0,0,0.35)]' : 'shadow-none',
      )}
    >
      {content}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={clsx(
          'absolute right-0 top-0 h-6 w-6 cursor-grab text-transparent opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100',
          isDragging ? 'cursor-grabbing opacity-100' : '',
        )}
        aria-label="Move panel"
      >
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-3 w-3 bg-[rgba(245,247,245,0.22)] transition-colors duration-150 group-hover:bg-[var(--accent)]"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
        />
      </button>
    </div>
  );
}
