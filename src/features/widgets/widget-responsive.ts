import type { WidgetRenderSize } from '@/features/widgets/widget-types';

export type ChartWidgetPresentation = 'summary' | 'compact-chart' | 'chart';
export type WidgetWidthMode = 'compact' | 'standard' | 'wide';

export function getChartWidgetPresentation(
  size: WidgetRenderSize,
  compactWidth: number,
  minimumChartHeight: number,
): ChartWidgetPresentation {
  if (size.height !== null && size.height < minimumChartHeight) return 'summary';
  if (size.width === null || size.width < compactWidth) return 'compact-chart';
  return 'chart';
}

export function getWidgetWidthMode(
  width: number | null,
  standardWidth: number,
  wideWidth: number,
): WidgetWidthMode {
  if (width === null || width < standardWidth) return 'compact';
  if (width < wideWidth) return 'standard';
  return 'wide';
}
