import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeChartColor,
  resolveCssColor,
} from '@/features/analytics/lib/lightweight-chart-colors';
import {
  CHART_PRICE_SCALE_ID,
  CHART_PRICE_SCALE_MINIMUM_WIDTH,
  HERO_ENDPOINT_ICON_SIZE,
  findHeroEndpoint,
} from '@/features/heroes/components/hero-winrate-lightweight-chart';

type FakeElement = {
  color: string;
  parent: FakeParent | null;
  remove: () => void;
  setAttribute: () => void;
  style: { color: string; display: string };
};

type FakeParent = {
  append: (element: FakeElement) => void;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chart price scale', () => {
  it('keeps the y-axis on the right', () => {
    expect(CHART_PRICE_SCALE_ID).toBe('right');
  });

  it('keeps the y-axis compact', () => {
    expect(CHART_PRICE_SCALE_MINIMUM_WIDTH).toBe(32);
  });
});

describe('hero endpoint icons', () => {
  it('keeps the indicator minimal', () => {
    expect(HERO_ENDPOINT_ICON_SIZE).toBe(14);
  });

  it('uses the final available point when a series ends before the timeline', () => {
    const earlierPoint = {
      time: 100,
      winrate: 0.51,
      wins: 51,
      losses: 49,
      matches: 100,
    };
    const finalPoint = {
      time: 200,
      winrate: 0.53,
      wins: 53,
      losses: 47,
      matches: 100,
    };
    const timeline = [
      { time: 100, values: { 1: earlierPoint } },
      { time: 200, values: { 1: finalPoint } },
      { time: 300, values: { 2: { ...finalPoint, time: 300 } } },
    ];

    expect(findHeroEndpoint(timeline, 1)).toBe(finalPoint);
    expect(findHeroEndpoint(timeline, 3)).toBeNull();
  });
});
describe('normalizeChartColor', () => {
  it('converts computed CSS sRGB colors to legacy RGB colors', () => {
    expect(normalizeChartColor('color(srgb 0.436275 0.683333 0.643333)'))
      .toBe('rgb(111, 174, 164)');
    expect(normalizeChartColor('color(srgb 0.436275 0.683333 0.643333 / 0.16)'))
      .toBe('rgba(111, 174, 164, 0.16)');
    expect(normalizeChartColor(
      'CoLoR (\tsRgB +4.36275e-1 .683333 6.43333E-1 / 1.6e-1 )',
    )).toBe('rgba(111, 174, 164, 0.16)');
  });

  it('clamps sRGB channels and alpha before conversion', () => {
    expect(normalizeChartColor('color(srgb -0.1 0.501 1.25 / 2)'))
      .toBe('rgb(0, 128, 255)');
    expect(normalizeChartColor('color(srgb -0.1 0.501 1.25 / -0.5)'))
      .toBe('rgba(0, 128, 255, 0)');
  });

  it('leaves legacy and named colors unchanged', () => {
    expect(normalizeChartColor('rgb(78, 154, 120)'))
      .toBe('rgb(78, 154, 120)');
    expect(normalizeChartColor('transparent')).toBe('transparent');
  });
});

describe('resolveCssColor', () => {
  it('resolves inherited theme tokens from the document body', () => {
    const container: FakeParent = {
      append: (element) => {
        element.parent = container;
      },
    };
    const body: FakeParent = {
      append: (element) => {
        element.parent = body;
      },
    };
    const probe: FakeElement = {
      color: '',
      parent: null,
      remove: () => {
        probe.parent = null;
      },
      setAttribute: () => undefined,
      style: { color: '', display: '' },
    };
    const owner = {
      ownerDocument: {
        body,
        createElement: () => probe,
      },
    } as unknown as HTMLElement;
    const getComputedStyleMock = vi.fn((element: FakeElement) => ({
      color: element.parent === body
        ? 'color(srgb 0.436275 0.683333 0.643333)'
        : 'rgba(0, 0, 0, 0)',
    }));
    vi.stubGlobal('getComputedStyle', getComputedStyleMock);

    container.append(probe);
    expect(resolveCssColor(owner, 'var(--chart-series-8)'))
      .toBe('rgb(111, 174, 164)');
    expect(getComputedStyleMock).toHaveBeenCalledWith(probe);
    expect(probe.style.color).toBe('var(--chart-series-8)');
    expect(probe.parent).toBeNull();
  });
});
