import { describe, expect, it } from 'vitest';
import {
  getChartWidgetPresentation,
  getWidgetWidthMode,
} from '@/features/widgets/widget-responsive';

describe('widget responsive selectors', () => {
  it('prioritizes a measured short height over width', () => {
    expect(getChartWidgetPresentation({ width: 1_000, height: 235 }, 560, 236)).toBe('summary');
    expect(getChartWidgetPresentation({ width: 559, height: 236 }, 560, 236)).toBe('compact-chart');
    expect(getChartWidgetPresentation({ width: 560, height: 236 }, 560, 236)).toBe('chart');
    expect(getChartWidgetPresentation({ width: 639, height: 236 }, 640, 236)).toBe('compact-chart');
    expect(getChartWidgetPresentation({ width: 640, height: 236 }, 640, 236)).toBe('chart');
  });

  it('treats missing dimensions conservatively without inventing short height', () => {
    expect(getChartWidgetPresentation({ width: null, height: null }, 560, 236)).toBe('compact-chart');
    expect(getChartWidgetPresentation({ width: 900, height: null }, 560, 236)).toBe('chart');
    expect(getChartWidgetPresentation({ width: null, height: 235 }, 560, 236)).toBe('summary');
  });

  it('selects compact, standard, and wide at exact width boundaries', () => {
    expect(getWidgetWidthMode(null, 640, 1000)).toBe('compact');
    expect(getWidgetWidthMode(639, 640, 1000)).toBe('compact');
    expect(getWidgetWidthMode(640, 640, 1000)).toBe('standard');
    expect(getWidgetWidthMode(999, 640, 1000)).toBe('standard');
    expect(getWidgetWidthMode(1000, 640, 1000)).toBe('wide');
  });
});
