import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  LineType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventHandler,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { resolveCssColor } from '@/features/analytics/lib/lightweight-chart-colors';
import type { GameStatsTimeSeriesPoint } from '@/features/analytics/lib/game-stats-timeseries';
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
const PRICE_SCALE_ID = 'right' as const;
const PRICE_SCALE_MINIMUM_WIDTH = 32;

type MetricLineSeries = ISeriesApi<'Line'>;

type TooltipData = {
  time: number;
  value: number;
  x: number;
  y: number;
};

export function GameStatsMetricChart({
  points,
  seriesLabel,
  color,
  formatAxisValue,
  formatTooltipValue,
  minMove,
  viewportResetKey,
  compact,
}: {
  points: readonly GameStatsTimeSeriesPoint[];
  seriesLabel: string;
  color: string;
  formatAxisValue: (value: number) => string;
  formatTooltipValue: (value: number) => string;
  minMove: number;
  viewportResetKey: string;
  compact: boolean;
}) {
  const { themeId } = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MetricLineSeries | null>(null);
  const pointsRef = useRef(new Map<number, number>());
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
    const resolvedColor = resolveCssColor(host, color);
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
      defaultVisiblePriceScaleId: PRICE_SCALE_ID,
      leftPriceScale: {
        visible: false,
        borderVisible: false,
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
    const series = chart.addSeries(LineSeries, {
      priceScaleId: PRICE_SCALE_ID,
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
        minMove,
        formatter: formatAxisValue,
      },
    });
    chartRef.current = chart;
    seriesRef.current = series;

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

      const value = pointsRef.current.get(event.time);
      if (value === undefined) {
        setTooltip(null);
        return;
      }

      setTooltip({
        time: event.time,
        value,
        x: currentHost.offsetLeft + event.point.x,
        y: currentHost.offsetTop + event.point.y,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      pointsRef.current.clear();
      lastViewportResetKeyRef.current = null;
      setTooltip(null);
      if (seriesRef.current === series) seriesRef.current = null;
      if (chartRef.current === chart) chartRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const previousVisibleRange = chart.timeScale().getVisibleRange();
    pointsRef.current = new Map(points.map((point) => [point.time, point.value]));
    series.setData(points.map((point) => ({
      time: point.time as UTCTimestamp,
      value: point.value,
    })));

    if (lastViewportResetKeyRef.current !== viewportResetKey) {
      chart.timeScale().fitContent();
      lastViewportResetKeyRef.current = viewportResetKey;
    } else if (previousVisibleRange) {
      chart.timeScale().setVisibleRange(previousVisibleRange);
    }
  }, [points, viewportResetKey]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const host = hostRef.current;
    if (!chart || !series || !host) return;

    const textColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.5)');
    const axisColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.12)');
    const gridColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.07)');
    const crosshairColor = resolveCssColor(host, 'rgb(var(--text-rgb) / 0.18)');
    const transparent = resolveCssColor(host, 'transparent');
    const resolvedColor = resolveCssColor(host, color);

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
    chart.priceScale(PRICE_SCALE_ID).applyOptions({
      autoScale: true,
      borderColor: axisColor,
      textColor,
    });
    series.applyOptions({
      color: resolvedColor,
      crosshairMarkerBorderColor: resolvedColor,
      crosshairMarkerBackgroundColor: resolvedColor,
      priceFormat: {
        type: 'custom',
        minMove,
        formatter: formatAxisValue,
      },
    });
  }, [color, formatAxisValue, minMove, themeId]);

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
            ? 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3'
            : 'grid grid-cols-[minmax(7rem,1fr)_auto] gap-x-5'}>
            <span className="font-semibold" style={{ color }}>{seriesLabel}</span>
            <span className="text-right font-semibold text-[var(--text-strong)]">
              {formatTooltipValue(tooltip.value)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
