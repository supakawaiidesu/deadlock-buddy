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

export type PreviewBar = {
  label: string;
  value: number;
  color?: string;
};

export function BarsWidgetPreview({ bars }: { bars: readonly PreviewBar[] }) {
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col justify-center gap-1.5 overflow-hidden bg-transparent px-2 py-1.5">
      {bars.map((bar, index) => {
        const width = Math.min(100, Math.max(0, bar.value));
        return (
          <div key={`${bar.label}-${index}`} className="grid grid-cols-[3.5rem_1fr] items-center gap-2">
            <span className="truncate text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--text-rgb)/0.5)]">
              {bar.label}
            </span>
            <span className="h-1.5 bg-[var(--surface-muted)]">
              <span
                className="block h-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: bar.color ?? 'var(--chart-series-1)',
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
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

export function LineWidgetPreview({
  series,
}: {
  series: readonly { color: string; points: string }[];
}) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full bg-transparent"
      viewBox="0 0 320 96"
      preserveAspectRatio="none"
    >
      <path d="M0 24H320M0 48H320M0 72H320" stroke="var(--surface-border-muted)" strokeWidth="1" />
      {series.map((line, index) => (
        <polyline
          key={index}
          points={line.points}
          fill="none"
          stroke={line.color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
