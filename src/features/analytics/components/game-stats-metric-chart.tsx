import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  LineType,
  PriceScaleMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventHandler,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { resolveCssColor } from '@/features/analytics/lib/lightweight-chart-colors';
import {
  calculatePercentageChange,
  findGameStatsSeriesBaseline,
  type GameStatsMetric,
  type GameStatsTimeSeriesPoint,
} from '@/features/analytics/lib/game-stats-timeseries';
import { useTheme } from '@/features/theme/theme-provider';

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
const RIGHT_PRICE_SCALE_ID = 'right' as const;
const LEFT_PRICE_SCALE_ID = 'left' as const;
const PRICE_SCALE_MINIMUM_WIDTH = 32;

export function gameStatsPriceScaleId(seriesCount: number, seriesIndex: number): 'left' | 'right' {
  return seriesCount === 2 && seriesIndex === 0 ? LEFT_PRICE_SCALE_ID : RIGHT_PRICE_SCALE_ID;
}

export function usesGameStatsPercentageScale(seriesCount: number): boolean {
  return seriesCount >= 3;
}

type MetricLineSeries = ISeriesApi<'Line'>;

export type GameStatsChartSeries = {
  metric: GameStatsMetric;
  label: string;
  color: string;
  points: readonly GameStatsTimeSeriesPoint[];
  minMove: number;
  formatAxisValue: (value: number) => string;
  formatTooltipValue: (value: number) => string;
};

type TooltipData = {
  time: number;
  values: Array<{ metric: GameStatsMetric; value: number; percentageChange: number | null }>;
  x: number;
  y: number;
};

type ResolvedSeriesColor = {
  normal: string;
  dimmed: string;
};

function resolveSeriesColors(
  owner: HTMLElement,
  series: readonly GameStatsChartSeries[],
): Map<GameStatsMetric, ResolvedSeriesColor> {
  return new Map(series.map((entry) => [
    entry.metric,
    {
      normal: resolveCssColor(owner, entry.color),
      dimmed: resolveCssColor(
        owner,
        `color-mix(in srgb, ${entry.color} 16%, transparent)`,
      ),
    },
  ]));
}

export function GameStatsMetricChart({
  series,
  focusedMetric,
  viewportResetKey,
  compact,
}: {
  series: readonly GameStatsChartSeries[];
  focusedMetric: GameStatsMetric | null;
  viewportResetKey: string;
  compact: boolean;
}) {
  const { themeId } = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef(new Map<GameStatsMetric, MetricLineSeries>());
  const valuesRef = useRef(new Map<number, Map<GameStatsMetric, number>>());
  const seriesConfigRef = useRef<readonly GameStatsChartSeries[]>(series);
  const scaleModeRef = useRef<'absolute' | 'percentage'>('absolute');
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
      defaultVisiblePriceScaleId: RIGHT_PRICE_SCALE_ID,
      leftPriceScale: {
        visible: false,
        autoScale: true,
        borderVisible: true,
        borderColor: axisColor,
        textColor,
        ticksVisible: false,
        minimumWidth: PRICE_SCALE_MINIMUM_WIDTH,
      },
      rightPriceScale: {
        visible: true,
        autoScale: true,
        borderVisible: true,
        borderColor: axisColor,
        textColor,
        ticksVisible: false,
        minimumWidth: PRICE_SCALE_MINIMUM_WIDTH,
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

      const values = valuesRef.current.get(event.time);
      if (!values) {
        setTooltip(null);
        return;
      }

      const percentageMode = scaleModeRef.current === 'percentage';
      const visibleStart = chart.timeScale().getVisibleRange()?.from;
      const visibleValues = seriesConfigRef.current.flatMap((entry) => {
        const value = values.get(entry.metric);
        if (value === undefined) return [];
        const baseline = percentageMode && typeof visibleStart === 'number'
          ? findGameStatsSeriesBaseline(entry.points, visibleStart)
          : null;
        return [{
          metric: entry.metric,
          value,
          percentageChange: baseline === null ? null : calculatePercentageChange(value, baseline),
        }];
      });
      if (visibleValues.length === 0) {
        setTooltip(null);
        return;
      }

      setTooltip({
        time: event.time,
        values: visibleValues,
        x: currentHost.offsetLeft + event.point.x,
        y: currentHost.offsetTop + event.point.y,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      seriesRef.current.clear();
      valuesRef.current.clear();
      seriesConfigRef.current = [];
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

    const previousVisibleRange = chart.timeScale().getVisibleRange();
    const selectedMetrics = new Set(series.map((entry) => entry.metric));
    seriesConfigRef.current = series;

    for (const [metric, line] of seriesRef.current) {
      if (selectedMetrics.has(metric)) continue;
      chart.removeSeries(line);
      seriesRef.current.delete(metric);
    }

    const valuesByTime = new Map<number, Map<GameStatsMetric, number>>();
    const resolvedColors = resolveSeriesColors(host, series);

    const percentageMode = usesGameStatsPercentageScale(series.length);
    scaleModeRef.current = percentageMode ? 'percentage' : 'absolute';
    chart.applyOptions({
      leftPriceScale: { visible: series.length === 2 },
      rightPriceScale: { visible: true },
    });

    for (const [seriesIndex, entry] of series.entries()) {
      const priceScaleId = gameStatsPriceScaleId(series.length, seriesIndex);
      let line = seriesRef.current.get(entry.metric);
      const resolvedColor = resolvedColors.get(entry.metric)?.normal ?? 'rgba(0, 0, 0, 0)';
      if (line && line.options().priceScaleId !== priceScaleId) {
        chart.removeSeries(line);
        seriesRef.current.delete(entry.metric);
        line = undefined;
      }
      if (!line) {
        line = chart.addSeries(LineSeries, {
          priceScaleId,
          color: resolvedColor,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          lineType: LineType.Simple,
          lineVisible: true,
          pointMarkersVisible: false,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          crosshairMarkerBorderColor: resolvedColor,
          crosshairMarkerBackgroundColor: resolvedColor,
          crosshairMarkerBorderWidth: 0,
          lastValueVisible: false,
          priceLineVisible: false,
          baseLineVisible: false,
          priceFormat: {
            type: 'custom',
            minMove: entry.minMove,
            formatter: entry.formatAxisValue,
          },
        });
        seriesRef.current.set(entry.metric, line);
      }
      line.applyOptions({
        priceFormat: {
          type: 'custom',
          minMove: entry.minMove,
          formatter: entry.formatAxisValue,
        },
      });
      line.setData(entry.points.map((point) => {
        let values = valuesByTime.get(point.time);
        if (!values) {
          values = new Map<GameStatsMetric, number>();
          valuesByTime.set(point.time, values);
        }
        values.set(entry.metric, point.value);
        return { time: point.time as UTCTimestamp, value: point.value };
      }));
    }
    valuesRef.current = valuesByTime;

    chart.priceScale(RIGHT_PRICE_SCALE_ID).applyOptions({
      mode: percentageMode ? PriceScaleMode.Percentage : PriceScaleMode.Normal,
      autoScale: true,
    });
    chart.priceScale(LEFT_PRICE_SCALE_ID).applyOptions({
      mode: PriceScaleMode.Normal,
      autoScale: true,
    });

    if (lastViewportResetKeyRef.current !== viewportResetKey) {
      chart.timeScale().fitContent();
      lastViewportResetKeyRef.current = viewportResetKey;
    } else if (previousVisibleRange) {
      chart.timeScale().setVisibleRange(previousVisibleRange);
    }
  }, [series, viewportResetKey]);

  useEffect(() => {
    const chart = chartRef.current;
    const host = hostRef.current;
    if (!chart || !host) return;

    const textColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.5)');
    const axisColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.12)');
    const gridColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.07)');
    const crosshairColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.18)');
    const transparent = resolveCssColor(host, 'transparent');
    const resolvedColors = resolveSeriesColors(host, series);

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
      leftPriceScale: {
        visible: series.length === 2,
        borderColor: axisColor,
        textColor,
      },
      rightPriceScale: { visible: true, borderColor: axisColor, textColor },
    });
    chart.priceScale(RIGHT_PRICE_SCALE_ID).applyOptions({
      autoScale: true,
      borderColor: axisColor,
      textColor,
    });
    chart.priceScale(LEFT_PRICE_SCALE_ID).applyOptions({
      autoScale: true,
      borderColor: axisColor,
      textColor,
    });

    for (const entry of series) {
      const line = seriesRef.current.get(entry.metric);
      const colors = resolvedColors.get(entry.metric);
      if (!line || !colors) continue;
      const lineColor = focusedMetric !== null && focusedMetric !== entry.metric
        ? colors.dimmed
        : colors.normal;
      line.applyOptions({
        color: lineColor,
        lineWidth: focusedMetric === entry.metric ? 3 : 2,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: lineColor,
      });
    }
  }, [focusedMetric, series, themeId]);

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
      <div ref={hostRef} className="analytics-time-series-chart-host absolute bottom-1 left-0 right-0 top-1" />
      {tooltip ? (
        <div
          ref={tooltipRef}
          className={compact
            ? 'pointer-events-auto absolute z-20 max-h-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-auto border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] px-3 py-2 text-xs shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm scroll-quiet'
            : 'pointer-events-none absolute z-20 border border-[rgb(var(--text-rgb)/0.16)] bg-[var(--overlay-background)] px-3 py-2 text-xs shadow-lg shadow-[rgb(var(--shadow-rgb)/0.35)] backdrop-blur-sm'}
          style={{ visibility: 'hidden' }}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-strong)]">
            {DATE_FORMAT.format(new Date(tooltip.time * 1000))}
          </div>
          <div className={compact
            ? 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1'
            : 'grid grid-cols-[minmax(7rem,1fr)_auto] gap-x-5 gap-y-1'}>
            {tooltip.values.map(({ metric, value, percentageChange }) => {
              const entry = series.find((candidate) => candidate.metric === metric);
              if (!entry) return null;
              return (
                <div key={metric} className="contents">
                  <span className="font-semibold" style={{ color: entry.color }}>{entry.label}</span>
                  <span className="text-right font-semibold text-[var(--text-strong)]">
                    {entry.formatTooltipValue(value)}
                    {scaleModeRef.current === 'percentage' ? (
                      <span className="ml-2 text-[10px] font-medium text-[rgb(var(--text-rgb)/0.55)]">
                        {percentageChange === null
                          ? '—'
                          : `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
