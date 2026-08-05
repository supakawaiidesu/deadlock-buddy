import type { ReactNode } from 'react';

export type WidgetInstance<TType extends string> = {
  id: string;
  type: TType;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WidgetRenderProps<TType extends string, TData> = {
  instance: WidgetInstance<TType>;
  data: TData;
  headerActions?: ReactNode;
};

export type WidgetDefinition<TType extends string, TData> = {
  type: TType;
  title: string;
  description?: string;
  defaultW: 1 | 2 | 3;
  defaultH: number;
  minW: 1 | 2 | 3;
  minH: number;
  render: (props: WidgetRenderProps<TType, TData>) => ReactNode;
};

export type WidgetRegistry<TType extends string, TData> = Record<
  TType,
  WidgetDefinition<TType, TData>
>;
