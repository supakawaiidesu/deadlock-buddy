import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  LineType,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type MouseEventHandler,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from 'lightweight-charts';
import { useTheme } from '@/features/theme/theme-provider';
import type {
  HeroWinratePoint,
  HeroWinrateTimelinePoint,
} from '@/features/heroes/lib/winrate-timeseries';

export type HeroWinrateChartHero = {
  heroId: number;
  name: string;
  color: string;
};

type HeroLineSeries = ISeriesApi<'Line'>;

type ReferenceLineState = {
  ownerId: number;
  owner: HeroLineSeries;
  line: IPriceLine;
};

type ResolvedHeroColors = {
  normal: string;
  dimmed: string;
};

type TooltipRow = {
  heroId: number;
  name: string;
  color: string;
  point: HeroWinratePoint;
};

type TooltipData = {
  time: number;
  x: number;
  y: number;
  rows: TooltipRow[];
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const AXIS_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const INITIAL_PRICE_RANGE = { from: 0.25, to: 0.75 } as const;
const PRICE_FORMAT = {
  type: 'custom',
  minMove: 0.01,
  formatter: (value: number) => `${Math.round(value * 100)}%`,
} as const;
export const CHART_PRICE_SCALE_ID = 'right' as const;
export const CHART_PRICE_SCALE_MINIMUM_WIDTH = 32;
const CSS_SRGB_COLOR_PATTERN = new RegExp(
  String.raw`^color\s*\(\s*srgb\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))?\s*\)$`,
  'i',
);

export function normalizeChartColor(value: string): string {
  const match = CSS_SRGB_COLOR_PATTERN.exec(value);
  if (!match) return value;

  const channel = (component: string) => (
    Math.round(Math.min(1, Math.max(0, Number(component))) * 255)
  );
  const red = channel(match[1]);
  const green = channel(match[2]);
  const blue = channel(match[3]);
  const alpha = match[4] === undefined
    ? 1
    : Math.min(1, Math.max(0, Number(match[4])));

  return alpha < 1
    ? `rgba(${red}, ${green}, ${blue}, ${alpha})`
    : `rgb(${red}, ${green}, ${blue})`;
}

export function resolveCssColor(owner: HTMLElement, value: string): string {
  const probe = owner.ownerDocument.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.display = 'none';
  probe.style.color = value;
  owner.ownerDocument.body.append(probe);

  try {
    return normalizeChartColor(getComputedStyle(probe).color);
  } finally {
    probe.remove();
  }
}

function resolveHeroColors(
  owner: HTMLElement,
  heroes: readonly HeroWinrateChartHero[],
): Map<number, ResolvedHeroColors> {
  return new Map(heroes.map((hero) => [
    hero.heroId,
    {
      normal: resolveCssColor(owner, hero.color),
      dimmed: resolveCssColor(
        owner,
        `color-mix(in srgb, ${hero.color} 16%, transparent)`,
      ),
    },
  ]));
}

function lineColor(
  heroId: number,
  focusedHeroId: number | null,
  colors: ReadonlyMap<number, ResolvedHeroColors>,
): string {
  const resolved = colors.get(heroId);
  if (!resolved) return 'rgba(0, 0, 0, 0)';
  return focusedHeroId !== null && focusedHeroId !== heroId
    ? resolved.dimmed
    : resolved.normal;
}

export function HeroWinrateLightweightChart({
  timeline,
  heroes,
  focusedHeroId,
  viewportResetKey,
}: {
  timeline: readonly HeroWinrateTimelinePoint[];
  heroes: readonly HeroWinrateChartHero[];
  focusedHeroId: number | null;
  viewportResetKey: string;
}) {
  const { themeId } = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef(new Map<number, HeroLineSeries>());
  const referenceLineRef = useRef<ReferenceLineState | null>(null);
  const timelineRef = useRef(new Map<number, HeroWinrateTimelinePoint>());
  const heroesRef = useRef<readonly HeroWinrateChartHero[]>(heroes);
  const colorsRef = useRef(new Map<number, ResolvedHeroColors>());
  const initialPriceRangeSetRef = useRef(false);
  const lastViewportResetKeyRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const textColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.5)');
    const axisColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.12)');
    const gridColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.07)');
    const crosshairColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.18)');
    const transparent = resolveCssColor(host, 'transparent');
    const chart = createChart(host, {
      autoSize: true,
      width: host.clientWidth,
      height: host.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: transparent },
        textColor,
        fontSize: 10,
        fontFamily: getComputedStyle(host).fontFamily,
        attributionLogo: true,
      },
      defaultVisiblePriceScaleId: CHART_PRICE_SCALE_ID,
      leftPriceScale: {
        visible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        visible: true,
        autoScale: false,
        borderVisible: true,
        borderColor: axisColor,
        textColor,
        ticksVisible: false,
        minimumWidth: CHART_PRICE_SCALE_MINIMUM_WIDTH,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: {
          visible: true,
          color: gridColor,
          style: LineStyle.Solid,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          color: crosshairColor,
          width: 1,
          style: LineStyle.Solid,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      timeScale: {
        borderVisible: true,
        borderColor: axisColor,
        ticksVisible: false,
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) => (
          typeof time === 'number'
            ? AXIS_DATE_FORMAT.format(new Date(time * 1000))
            : null
        ),
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
    });
    chartRef.current = chart;

    const handleCrosshairMove: MouseEventHandler<Time> = (event) => {
      const frame = frameRef.current;
      const currentHost = hostRef.current;
      if (
        !frame ||
        !currentHost ||
        typeof event.time !== 'number' ||
        !event.point
      ) {
        setTooltip(null);
        return;
      }

      const paneSize = chart.paneSize();
      if (
        event.point.x < 0 ||
        event.point.y < 0 ||
        event.point.x > paneSize.width ||
        event.point.y > paneSize.height
      ) {
        setTooltip(null);
        return;
      }

      const row = timelineRef.current.get(event.time);
      if (!row) {
        setTooltip(null);
        return;
      }

      const rows = heroesRef.current.flatMap((hero) => {
        const point = row.values[hero.heroId];
        if (!point) return [];
        const color = hero.color;
        return [{
          heroId: hero.heroId,
          name: hero.name,
          color,
          point,
        }];
      });
      if (rows.length === 0) {
        setTooltip(null);
        return;
      }

      setTooltip({
        time: event.time,
        x: currentHost.offsetLeft + event.point.x,
        y: currentHost.offsetTop + event.point.y,
        rows,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      const referenceLine = referenceLineRef.current;
      if (referenceLine) {
        referenceLine.owner.removePriceLine(referenceLine.line);
        referenceLineRef.current = null;
      }
      seriesRef.current.clear();
      timelineRef.current.clear();
      heroesRef.current = [];
      colorsRef.current.clear();
      initialPriceRangeSetRef.current = false;
      lastViewportResetKeyRef.current = null;
      setTooltip(null);
      if (chartRef.current === chart) chartRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const host = hostRef.current;
    if (!chart || !host) return;

    timelineRef.current = new Map(timeline.map((row) => [row.time, row]));
    heroesRef.current = heroes;
    const previousVisibleRange = chart.timeScale().getVisibleRange();
    const selectedHeroIds = new Set(heroes.map((hero) => hero.heroId));
    const currentReferenceLine = referenceLineRef.current;

    if (currentReferenceLine && !selectedHeroIds.has(currentReferenceLine.ownerId)) {
      currentReferenceLine.owner.removePriceLine(currentReferenceLine.line);
      referenceLineRef.current = null;
    }

    for (const [heroId, series] of seriesRef.current) {
      if (selectedHeroIds.has(heroId)) continue;
      chart.removeSeries(series);
      seriesRef.current.delete(heroId);
    }

    const resolvedColors = resolveHeroColors(host, heroes);
    colorsRef.current = resolvedColors;

    for (const hero of heroes) {
      let series = seriesRef.current.get(hero.heroId);
      if (!series) {
        const color = resolvedColors.get(hero.heroId)?.normal ?? 'rgba(0, 0, 0, 0)';
        series = chart.addSeries(LineSeries, {
          priceScaleId: CHART_PRICE_SCALE_ID,
          color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          lineType: LineType.Simple,
          lineVisible: true,
          pointMarkersVisible: false,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          crosshairMarkerBorderColor: color,
          crosshairMarkerBackgroundColor: color,
          crosshairMarkerBorderWidth: 0,
          lastValueVisible: false,
          priceLineVisible: false,
          baseLineVisible: false,
          priceFormat: PRICE_FORMAT,
        });
        seriesRef.current.set(hero.heroId, series);
      }

      const data: Array<LineData<UTCTimestamp> | WhitespaceData<UTCTimestamp>> = timeline.map((row) => {
        const point = row.values[hero.heroId];
        const time = row.time as UTCTimestamp;
        return point ? { time, value: point.winrate } : { time };
      });
      series.setData(data);
    }

    if (!referenceLineRef.current) {
      const ownerHero = heroes.find((hero) => seriesRef.current.has(hero.heroId));
      const owner = ownerHero ? seriesRef.current.get(ownerHero.heroId) : undefined;
      if (ownerHero && owner) {
        referenceLineRef.current = {
          ownerId: ownerHero.heroId,
          owner,
          line: owner.createPriceLine({
            price: 0.5,
            color: resolveCssColor(host, 'rgb(var(--text-rgb) / 0.2)'),
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            lineVisible: true,
            axisLabelVisible: false,
            title: '',
          }),
        };
      }
    }

    if (!initialPriceRangeSetRef.current) {
      const priceScale = chart.priceScale(CHART_PRICE_SCALE_ID);
      priceScale.setAutoScale(false);
      priceScale.setVisibleRange(INITIAL_PRICE_RANGE);
      initialPriceRangeSetRef.current = true;
    }

    const shouldResetViewport = lastViewportResetKeyRef.current !== viewportResetKey;
    if (shouldResetViewport) {
      chart.timeScale().fitContent();
      lastViewportResetKeyRef.current = viewportResetKey;
    } else if (previousVisibleRange) {
      chart.timeScale().setVisibleRange(previousVisibleRange);
    }
  }, [heroes, timeline, viewportResetKey]);

  useEffect(() => {
    const chart = chartRef.current;
    const host = hostRef.current;
    if (!chart || !host) return;

    const textColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.5)');
    const axisColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.12)');
    const gridColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.07)');
    const crosshairColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.18)');
    const transparent = resolveCssColor(host, 'transparent');
    const resolvedColors = resolveHeroColors(host, heroes);
    colorsRef.current = resolvedColors;

    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: transparent },
        textColor,
        fontSize: 10,
        fontFamily: getComputedStyle(host).fontFamily,
        attributionLogo: true,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: true, color: gridColor, style: LineStyle.Solid },
      },
      crosshair: {
        vertLine: {
          visible: true,
          color: crosshairColor,
          width: 1,
          style: LineStyle.Solid,
          labelVisible: false,
        },
        horzLine: { visible: false, labelVisible: false },
      },
      timeScale: { borderColor: axisColor },
      rightPriceScale: { borderColor: axisColor, textColor },
    });
    chart.priceScale(CHART_PRICE_SCALE_ID).applyOptions({
      borderColor: axisColor,
      textColor,
    });

    for (const hero of heroes) {
      const series = seriesRef.current.get(hero.heroId);
      if (!series) continue;
      const color = lineColor(hero.heroId, focusedHeroId, resolvedColors);
      series.applyOptions({
        color,
        lineWidth: focusedHeroId === hero.heroId ? 3 : 2,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: color,
      });
    }

    referenceLineRef.current?.line.applyOptions({
      color: resolveCssColor(host, 'rgb(var(--text-rgb) / 0.2)'),
    });
  }, [focusedHeroId, heroes, themeId]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const element = tooltipRef.current;
    if (!frame || !element || !tooltip) return;

    const gap = 12;
    const maxLeft = Math.max(0, frame.clientWidth - element.offsetWidth);
    const maxTop = Math.max(0, frame.clientHeight - element.offsetHeight);
    const preferredLeft = tooltip.x + gap + element.offsetWidth <= frame.clientWidth
      ? tooltip.x + gap
      : tooltip.x - gap - element.offsetWidth;
    const preferredTop = tooltip.y + gap + element.offsetHeight <= frame.clientHeight
      ? tooltip.y + gap
      : tooltip.y - gap - element.offsetHeight;

    element.style.left = `${Math.min(maxLeft, Math.max(0, preferredLeft))}px`;
    element.style.top = `${Math.min(maxTop, Math.max(0, preferredTop))}px`;
    element.style.visibility = 'visible';
  }, [tooltip]);

  return (
    <div ref={frameRef} className="relative h-full w-full">
      <div ref={hostRef} className="hero-winrate-chart-host absolute bottom-1 left-0 right-0 top-1" />
      {tooltip ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-20 border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] px-3 py-2 text-xs shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm"
          style={{ visibility: 'hidden' }}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-strong)]">
            {DATE_FORMAT.format(new Date(tooltip.time * 1000))}
          </div>
          <div className="flex flex-col gap-2">
            {tooltip.rows.map(({ heroId, name, color, point }) => (
              <div key={heroId} className="grid grid-cols-[minmax(7rem,1fr)_auto] gap-x-5 gap-y-0.5">
                <span className="font-semibold" style={{ color }}>{name}</span>
                <span className="text-right font-semibold text-[var(--text-strong)]">
                  {(point.winrate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.5)]">
                  {point.wins.toLocaleString()}–{point.losses.toLocaleString()}
                </span>
                <span className="text-right text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.5)]">
                  {point.matches.toLocaleString()} matches
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
