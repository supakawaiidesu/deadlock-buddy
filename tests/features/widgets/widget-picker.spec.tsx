// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WidgetGrid } from '@/features/widgets/components/widget-grid';
import {
  WIDGET_ADD_PICKER_CLOSE_EVENT,
  WIDGET_ADD_PICKER_STATE_EVENT,
  WIDGET_ADD_PICKER_TOGGLE_EVENT,
} from '@/features/widgets/widget-events';
import type { WidgetInstance, WidgetRegistry } from '@/features/widgets/widget-types';

const STORAGE_KEY = 'widget-picker-spec-layout';
const LEGACY_STORAGE_KEY = 'widget-picker-spec-layout-legacy';
type TestWidgetType = 'a' | 'b';
type TestWidgetInstance = WidgetInstance<TestWidgetType>;

const registry: WidgetRegistry<TestWidgetType, null, TestWidgetInstance> = {
  a: {
    type: 'a',
    title: 'Alpha widget',
    description: 'Shows the alpha metric at a glance.',
    preview: <span>Alpha preview</span>,
    defaultW: 1,
    defaultH: 3,
    createInstance: (id, rect) => ({ id, type: 'a', ...rect }),
    sanitizeInstance: (raw, rect) => ({
      id: readId(raw),
      type: 'a',
      ...rect,
    }),
    render: () => null,
  },
  b: {
    type: 'b',
    title: 'Beta widget',
    description: 'Summarizes the beta metric over time.',
    preview: <span>Beta preview</span>,
    defaultW: 1,
    defaultH: 3,
    createInstance: (id, rect) => ({ id, type: 'b', ...rect }),
    sanitizeInstance: (raw, rect) => ({
      id: readId(raw),
      type: 'b',
      ...rect,
    }),
    render: () => null,
  },
};

const defaultLayout: TestWidgetInstance[] = [
  { id: 'existing-a', type: 'a', x: 0, y: 0, w: 1, h: 3 },
];

function readId(raw: unknown): string {
  return raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
    ? raw.id
    : '';
}

function TestGrid() {
  return (
    <WidgetGrid
      registry={registry}
      defaultLayout={defaultLayout}
      storageKey={STORAGE_KEY}
      legacyThreeColumnStorageKey={LEGACY_STORAGE_KEY}
      emptyStateTitle="No widgets"
      data={null}
    />
  );
}

function openPicker() {
  act(() => {
    window.dispatchEvent(new Event(WIDGET_ADD_PICKER_TOGGLE_EVENT));
  });
}

function storedTypes(): TestWidgetType[] {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  return (JSON.parse(stored) as TestWidgetInstance[]).map((widget) => widget.type);
}

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('widget picker', () => {
  it('opens a searchable modal catalog and restores focus after native cancellation', () => {
    const states: boolean[] = [];
    const handleState = (event: Event) => {
      states.push(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);

    render(
      <>
        <button type="button">Local trigger</button>
        <TestGrid />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Local trigger' });
    trigger.focus();

    openPicker();

    const dialog = screen.getByRole('dialog', { name: 'Add a widget' });
    const search = screen.getByRole('searchbox', { name: 'Search widgets' });
    expect(search.getAttribute('placeholder')).toBe('Search widgets…');
    expect(search.getAttribute('type')).toBe('text');
    expect(document.activeElement).toBe(search);
    expect(screen.getAllByText(/^(Alpha|Beta) widget$/).map((title) => title.textContent)).toEqual([
      'Alpha widget',
      'Beta widget',
    ]);
    expect(screen.queryByText('Alpha preview')).toBeNull();
    expect(screen.queryByText('Beta preview')).toBeNull();
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));

    expect(screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    expect(states.at(-1)).toBe(false);
    expect(document.activeElement).toBe(trigger);
    window.removeEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);
  });

  it('shows one mock preview and description on row hover or focus', () => {
    render(<TestGrid />);
    openPicker();

    const alpha = screen.getByRole('button', { name: 'Alpha widget' });
    fireEvent.mouseEnter(alpha);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('Alpha preview');
    expect(tooltip.textContent).toContain('Shows the alpha metric at a glance.');
    expect(alpha.getAttribute('aria-describedby')).toBe('widget-picker-option-preview');

    fireEvent.mouseLeave(alpha);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(screen.getByRole('button', { name: 'Beta widget' }));
    expect(screen.getByRole('tooltip').textContent).toContain('Beta preview');
    expect(screen.getByRole('tooltip').textContent).toContain('Summarizes the beta metric over time.');
  });

  it('marks the active option and preview as one connected surface', () => {
    render(<TestGrid />);
    openPicker();

    const alpha = screen.getByRole('button', { name: 'Alpha widget' });
    vi.spyOn(alpha, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 200, 320, 44));
    const beta = screen.getByRole('button', { name: 'Beta widget' });
    fireEvent.mouseEnter(alpha);

    const tooltip = screen.getByRole('tooltip');
    expect(alpha.getAttribute('data-preview-visible')).toBe('true');
    expect(beta.getAttribute('data-preview-visible')).toBe('false');
    expect(tooltip.className).toContain('widget-picker-preview');
    expect(tooltip.className).not.toContain('shadow');
    expect(tooltip.querySelector('[aria-hidden="true"].absolute')).toBeTruthy();
    expect(tooltip.style.top).toBe('199px');
    expect(tooltip.style.left).toBe('620px');
    const connector = tooltip.querySelector<HTMLElement>('[aria-hidden="true"].absolute');
    expect(connector?.style.top).toBe('0px');
    expect(connector?.style.height).toBe('43px');
  });

  it('filters options by title and reports an empty result', () => {
    render(<TestGrid />);
    openPicker();

    const search = screen.getByRole('searchbox', { name: 'Search widgets' });
    fireEvent.change(search, { target: { value: 'beta' } });
    expect(screen.queryByRole('button', { name: 'Alpha widget' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Beta widget' })).toBeTruthy();

    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.queryByRole('button', { name: 'Beta widget' })).toBeNull();
    expect(screen.getByText('No widgets match “missing”').getAttribute('role')).toBe('status');
  });

  it('allows adding a duplicate widget type and closes after one selection', async () => {
    render(<TestGrid />);

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Alpha widget' }));

    await waitFor(() => expect(storedTypes()).toEqual(['a', 'a']));
    expect(screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
  });

  it('persists additions in order and keeps every type available after remount', async () => {
    const first = render(<TestGrid />);

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Alpha widget' }));
    await waitFor(() => expect(storedTypes()).toEqual(['a', 'a']));

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Beta widget' }));
    await waitFor(() => expect(storedTypes()).toEqual(['a', 'a', 'b']));

    first.unmount();
    render(<TestGrid />);
    openPicker();

    expect(screen.getByRole('button', { name: 'Alpha widget' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Beta widget' })).toBeTruthy();
  });

  it('reports closed state for close events and unmounts', () => {
    const states: boolean[] = [];
    const handleState = (event: Event) => {
      states.push(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);
    const view = render(<TestGrid />);

    openPicker();
    act(() => {
      window.dispatchEvent(new Event(WIDGET_ADD_PICKER_CLOSE_EVENT));
    });
    expect(screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    expect(states.at(-1)).toBe(false);

    openPicker();
    expect(states.at(-1)).toBe(true);
    view.unmount();
    expect(states.at(-1)).toBe(false);
    window.removeEventListener(WIDGET_ADD_PICKER_STATE_EVENT, handleState);
  });
});
