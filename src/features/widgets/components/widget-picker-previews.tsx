export type PreviewMetric = {
  label: string;
  value: string;
};

export function MetricWidgetPreview({ metrics }: { metrics: readonly PreviewMetric[] }) {
  return (
    <div
      aria-hidden="true"
      className="grid h-full w-full overflow-hidden bg-transparent"
      style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
    >
      {metrics.map((metric, index) => (
        <div
          key={`${metric.label}-${index}`}
          className="flex min-w-0 flex-col justify-center gap-1 border-r border-[var(--surface-border-muted)] px-2 last:border-r-0"
        >
          <span className="truncate text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--text-rgb)/0.45)]">
            {metric.label}
          </span>
          <span className="truncate text-sm font-semibold tabular-nums text-[var(--text-strong)]">
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export type PreviewRow = {
  label: string;
  value: string;
  meta?: string;
};

export function RowsWidgetPreview({ rows }: { rows: readonly PreviewRow[] }) {
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col overflow-hidden bg-transparent">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="grid min-h-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-2 border-b border-[var(--surface-border-muted)] px-2 last:border-b-0"
        >
          <span className="min-w-0 truncate text-[10px] font-medium text-[var(--text-strong)]">
            {row.label}
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-[var(--accent)]">
            {row.value}
          </span>
          {row.meta ? (
            <span className="col-span-2 truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--text-rgb)/0.42)]">
              {row.meta}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export type PreviewHistogramBand = {
  label: string;
  color: string;
  values: readonly number[];
};

export function HistogramWidgetPreview({
  bands,
}: {
  bands: readonly PreviewHistogramBand[];
}) {
  const chartLeft = 31;
  const chartRight = 314;
  const chartTop = 10;
  const chartBottom = 88;
  const barGap = 1;
  const bandGap = 3;
  let totalBars = 0;
  let maxValue = 1;

  for (const band of bands) {
    totalBars += band.values.length;
    for (const value of band.values) maxValue = Math.max(maxValue, value);
  }

  const plotWidth = chartRight - chartLeft;
  const innerGaps = Math.max(0, totalBars - bands.length) * barGap;
  const bandGaps = Math.max(0, bands.length - 1) * bandGap;
  const barWidth = totalBars > 0
    ? Math.max(1, (plotWidth - innerGaps - bandGaps) / totalBars)
    : 0;
  let cursorX = chartLeft;

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full bg-transparent"
      viewBox="0 0 320 112"
      preserveAspectRatio="none"
    >
      {[chartTop, 36, 62, chartBottom].map((y, index) => (
        <g key={y}>
          <line
            x1={chartLeft}
            x2={chartRight}
            y1={y}
            y2={y}
            stroke="rgb(var(--text-rgb)/0.08)"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={chartLeft - 5}
            y={y}
            fill="rgb(var(--text-rgb)/0.4)"
            fontSize="7"
            textAnchor="end"
            dominantBaseline={index === 3 ? 'auto' : 'middle'}
          >
            {['90K', '60K', '30K', '0'][index]}
          </text>
        </g>
      ))}

      {bands.map((band, bandIndex) => {
        const bandStart = cursorX;
        const bars = band.values.map((value, valueIndex) => {
          const height = Math.max(2, (Math.max(0, value) / maxValue) * (chartBottom - chartTop));
          const x = cursorX;
          cursorX += barWidth;
          if (valueIndex < band.values.length - 1) cursorX += barGap;
          return (
            <rect
              key={valueIndex}
              x={x}
              y={chartBottom - height}
              width={barWidth}
              height={height}
              rx="1"
              fill={band.color}
            />
          );
        });
        const bandEnd = cursorX;
        if (bandIndex < bands.length - 1) cursorX += bandGap;

        return (
          <g key={`${band.label}-${bandIndex}`}>
            {bars}
            <text
              x={(bandStart + bandEnd) / 2}
              y="103"
              fill="rgb(var(--text-rgb)/0.52)"
              fontSize="7"
              textAnchor="middle"
            >
              {band.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TableWidgetPreview({
  headers,
  rows,
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  const columns = { gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` };
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col overflow-hidden bg-transparent">
      <div className="grid h-6 shrink-0 border-b border-[var(--surface-border-muted)] bg-[var(--surface-muted)]" style={columns}>
        {headers.map((header, index) => (
          <span
            key={`${header}-${index}`}
            className="flex min-w-0 items-center truncate border-r border-[var(--surface-border-muted)] px-1.5 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--text-rgb)/0.45)] last:border-r-0"
          >
            {header}
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid min-h-0 flex-1 border-b border-[var(--surface-border-muted)] last:border-b-0"
            style={columns}
          >
            {row.map((cell, cellIndex) => (
              <span
                key={cellIndex}
                className="flex min-w-0 items-center truncate border-r border-[var(--surface-border-muted)] px-1.5 text-[9px] tabular-nums text-[rgb(var(--text-rgb)/0.72)] first:text-[var(--text-strong)] last:border-r-0"
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export type PreviewHistoryRow = {
  outcome: 'W' | 'L';
  label: string;
  value: string;
};

export function HistoryWidgetPreview({ rows }: { rows: readonly PreviewHistoryRow[] }) {
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col overflow-hidden bg-transparent">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="grid min-h-0 flex-1 grid-cols-[1.75rem_1fr_auto] items-center border-b border-[var(--surface-border-muted)] last:border-b-0"
        >
          <span
            className="flex h-full items-center justify-center border-r border-[var(--surface-border-muted)] text-[9px] font-bold"
            style={{ color: row.outcome === 'W' ? 'var(--chart-series-1)' : 'var(--chart-series-3)' }}
          >
            {row.outcome}
          </span>
          <span className="truncate px-2 text-[9px] text-[var(--text-strong)]">{row.label}</span>
          <span className="pr-2 text-[9px] tabular-nums text-[rgb(var(--text-rgb)/0.55)]">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export type PreviewLineSeries = {
  color: string;
  points: string;
  heroName: string;
  iconUrl: string | null;
};

export function LineWidgetPreview({
  series,
}: {
  series: readonly PreviewLineSeries[];
}) {
  return (
    <div aria-hidden="true" className="relative h-full w-full overflow-hidden bg-transparent">
      <svg
        className="h-full w-full"
        viewBox="0 0 320 112"
        preserveAspectRatio="none"
      >
        <line
          x1="18"
          x2="288"
          y1="91"
          y2="91"
          stroke="rgb(var(--text-rgb)/0.22)"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="288"
          x2="288"
          y1="14"
          y2="91"
          stroke="rgb(var(--text-rgb)/0.22)"
          vectorEffect="non-scaling-stroke"
        />

        {[
          { x: 18, label: 'Jul 20', anchor: 'start' as const },
          { x: 112, label: 'Jul 30', anchor: 'middle' as const },
          { x: 206, label: 'Aug 9', anchor: 'middle' as const },
        ].map((tick) => (
          <text
            key={tick.label}
            x={tick.x}
            y="104"
            fill="rgb(var(--text-rgb)/0.45)"
            fontSize="7"
            textAnchor={tick.anchor}
          >
            {tick.label}
          </text>
        ))}

        {[
          { y: 19, label: '60%' },
          { y: 53, label: '50%' },
          { y: 87, label: '40%' },
        ].map((tick) => (
          <text
            key={tick.label}
            x="294"
            y={tick.y}
            fill="rgb(var(--text-rgb)/0.45)"
            fontSize="7"
            dominantBaseline="middle"
          >
            {tick.label}
          </text>
        ))}

        {series.map((line, index) => (
          <polyline
            key={`${line.heroName}-${index}`}
            points={line.points}
            fill="none"
            stroke={line.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="absolute right-12 top-2 flex flex-row-reverse gap-1 border border-[rgb(var(--text-rgb)/0.12)] bg-[var(--overlay-soft-background)] p-1">
        {series.map((line, index) => (
          <span
            key={`${line.heroName}-${index}`}
            title={line.heroName}
            className="h-5 w-5 overflow-hidden border bg-[var(--surface-muted)]"
            style={{ borderColor: line.color }}
          >
            {line.iconUrl ? (
              <img
                src={line.iconUrl}
                alt=""
                width={20}
                height={20}
                className="h-full w-full object-cover"
                decoding="async"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[7px] font-semibold text-[var(--text-strong)]">
                {line.heroName.slice(0, 1)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
