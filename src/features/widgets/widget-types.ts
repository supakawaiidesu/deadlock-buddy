import type { ReactNode } from 'react';
import type { GridRect } from '@/features/widgets/widget-engine';

export type WidgetInstance<TType extends string> = GridRect & {
  id: string;
  type: TType;
};

export type WidgetRenderProps<
  TType extends string,
  TData,
  TInstance extends WidgetInstance<TType> = WidgetInstance<TType>,
> = {
  instance: TInstance;
  data: TData | null;
  onInstanceChange: (next: TInstance) => void;
  headerActions?: ReactNode;
};

export type WidgetDefinition<
  TType extends string,
  TData,
  TInstance extends WidgetInstance<TType> = WidgetInstance<TType>,
> = {
  type: TType;
  title: string;
  preview: ReactNode;
  description?: string;
  defaultW: 1 | 2 | 3;
  defaultH: number;
  minW: 1 | 2 | 3;
  minH: number;
  createInstance: (id: string, rect: GridRect) => TInstance;
  sanitizeInstance: (raw: unknown, rect: GridRect) => TInstance;
  renderWhileLoading?: boolean;
  render: (props: WidgetRenderProps<TType, TData, TInstance>) => ReactNode;
};

export type WidgetRegistry<
  TType extends string,
  TData,
  TInstance extends WidgetInstance<TType> = WidgetInstance<TType>,
> = Record<TType, WidgetDefinition<TType, TData, TInstance>>;

export function createGeometryWidgetInstance<TType extends string>(
  type: TType,
  id: string,
  rect: GridRect,
): WidgetInstance<TType> {
  return { id, type, ...rect };
}

export function createGeometryWidgetLifecycle<TType extends string>(type: TType) {
  return {
    createInstance: (id: string, rect: GridRect) => createGeometryWidgetInstance(type, id, rect),
    sanitizeInstance: (raw: unknown, rect: GridRect) => {
      const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string'
        ? raw.id
        : '';
      return createGeometryWidgetInstance(type, id, rect);
    },
  };
}
