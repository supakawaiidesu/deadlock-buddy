import type { ReactNode } from 'react';

export type WidgetInstance<TType extends string> = {
  id: string;
  type: TType;
};

export type WidgetRenderProps<TType extends string, TData> = {
  instance: WidgetInstance<TType>;
  data: TData;
  headerActions?: ReactNode;
  outerRef?: (node: HTMLDivElement | null) => void;
};

export type WidgetDefinition<TType extends string, TData> = {
  type: TType;
  title: string;
  description?: string;
  columnSpan?: 1 | 2 | 3;
  render: (props: WidgetRenderProps<TType, TData>) => ReactNode;
};

export type WidgetRegistry<TType extends string, TData> = Record<
  TType,
  WidgetDefinition<TType, TData>
>;
