# Game-Stats Metric Chart Implementation Guide

This guide records the process used to add the **Total matches over time** dashboard widget and turns it into a repeatable path for later `/v1/analytics/game-stats` metrics such as `avg_kills`.

The key decision is the cache boundary: `/v1/analytics/game-stats` returns every aggregate in one validated row. TanStack Query stores that complete response under the server filters. A total-matches widget and an average-kills widget with identical filters must project different fields from the same cached array, not issue metric-specific requests.

For hero-specific history, use `docs/chart-widget.md`. That endpoint, cache shape, multi-series renderer, and hero-selection behavior are intentionally separate.

## Start from the approved plan

When a task supplies an approved plan file, treat the file as the execution specification rather than relying on compressed chat context.

1. Read the exact plan path first. If the task names a `local://` URI, recover it through the file-reading tool before inspecting or editing source.
2. Convert every plan item into tracked implementation steps. Keep transport/cache, pure transforms, UI, persistence/sharing, and verification separate.
3. Read the plan’s named anchors and current repository code before editing. Reuse current contracts; do not create a second query, control, chart-color, or preview convention.
4. Implement in dependency order:
   - external schema;
   - transport and query cache;
   - pure projection;
   - reusable controls/chart;
   - widget panel;
   - registry, persistence, and share integration;
   - focused tests, then full verification.
5. Verify each layer before moving to the next. A schema/transport test proves the wire contract; a pure test proves projection behavior; registry/share tests prove durability; the full suite, lint, and production build prove integration.

The total-matches implementation followed that order. This prevented the visible chart from defining its own reduced fetch contract and made later metric reuse possible.

## Current reusable architecture

### Complete transport and shared cache

- `src/lib/api/schema.ts`
  - `AnalyticsGameStatsSchema` validates the complete current game-stats row.
  - `AnalyticsGameStats` is the inferred full row type.
  - `AnalyticsGameStatsResponseSchema` validates the array.
- `src/lib/api/analytics.ts`
  - `GameStatsFilters` contains `minUnixTimestamp`, `minAverageBadge`, and `maxAverageBadge`.
  - `fetchGameStats` sends the fixed day bucket, normal game mode, combined ranked/unranked match mode, and those three filters.
- `src/features/analytics/api/queries.ts`
  - `gameStatsQueryKey`, `gameStatsQueryOptions`, and `useGameStats` own the single cache entry.
  - The cached value is the complete `AnalyticsGameStats[]`; there is no query-level metric projection.
- `src/providers.tsx`
  - Global query defaults provide the five-minute stale time, one-hour garbage collection, retries, and persisted-cache behavior. Metric widgets must inherit these defaults.

The key is exactly:

```ts
[
  'analytics',
  'game-stats',
  'start_time_day',
  filters.minUnixTimestamp,
  filters.minAverageBadge,
  filters.maxAverageBadge,
] as const
```

A metric name does not belong in this key because it does not change the server response. Do not send a metric query parameter. Do not create `useAverageKills`, `fetchAverageKills`, or a component-local request.

Do not add game stats to `DashboardDataBundle` or `useDashboardData`. That aggregate dashboard query has different failure and freshness semantics. Each game-stats widget should call `useGameStats(settings)` directly; TanStack Query deduplicates identical filters.

### Pure metric projection

`src/features/analytics/lib/game-stats-timeseries.ts` exports:

```ts
buildGameStatsMetricSeries(rows, metric)
```

`GameStatsMetric` is every numeric `AnalyticsGameStats` key except `bucket`. The helper:

- reads one requested field;
- retains valid zero values;
- uses the last upstream row for a duplicate bucket;
- returns unique points sorted by ascending Unix timestamp;
- never mutates cached rows.

Examples:

```ts
const matches = buildGameStatsMetricSeries(rows, 'total_matches');
const kills = buildGameStatsMetricSeries(rows, 'avg_kills');
```

Both projections can use the same `rows` reference returned by `useGameStats`.

### Shared filter controls

`src/features/analytics/components/analytics-time-series-filter-controls.tsx` owns the reusable rank/date UI. Its contract is:

```ts
<AnalyticsTimeSeriesFilterControls
  values={settings}
  onChange={updateSettings}
  mode="strip" // or "overlay"
/>
```

`AnalyticsTimeSeriesFilterValues` lives in `src/features/analytics/lib/time-series-filters.ts`. Preserve these behaviors:

- dates display and parse as UTC `YYYY-MM-DD`;
- invalid and future dates are rejected;
- badge `0` means all ranks;
- badge options run through `116`;
- selecting a minimum rank resets the maximum to `116`;
- details menus close on focus leaving the menu;
- full-width widgets use strip mode; compact widgets use overlay mode.

A new game-stats metric normally reuses `GameStatsTimeSeriesSettings`, `createDefaultGameStatsTimeSeriesSettings`, and `AnalyticsTimeSeriesFilterSettingsSchema` unchanged.

### Shared single-series chart

`src/features/analytics/components/game-stats-metric-chart.tsx` owns Lightweight Charts for one endpoint metric. Its varying inputs are:

```ts
<GameStatsMetricChart
  points={points}
  seriesLabel="Average kills"
  color="var(--chart-series-2)"
  formatAxisValue={formatNumber}
  formatTooltipValue={(value) => `${formatNumber(value)} kills`}
  minMove={0.1}
  viewportResetKey={viewportResetKey}
  compact={presentation === 'compact-chart'}
/>
```

Choose `minMove` and formatters from the metric’s precision. Counts such as `total_matches` use `minMove={1}`; averaged decimal fields usually use a decimal step such as `0.1`, subject to the upstream field’s meaningful precision.

Keep these chart invariants:

- one auto-sized `LineSeries` on the right price scale;
- automatic y-axis scaling;
- UTC time-axis labels and tooltip dates;
- mouse/touch pan and zoom;
- `fitContent()` only when `viewportResetKey` changes;
- preservation of the visible time range during same-filter refreshes;
- concrete CSS color resolution through `lightweight-chart-colors.ts` whenever the theme changes;
- frame-edge-clamped tooltip positioning;
- exact subscription cleanup and `chart.remove()` on unmount;
- `.analytics-time-series-chart-host` for the shared Lightweight Charts table fix;
- visible TradingView attribution.

Do not copy hero-chart percentage bounds, its 50% reference line, hero endpoints, multi-series diffing, or focus behavior into a game-stats metric chart.

## Adding an average-kills widget

Use a distinct durable widget type, for example `average-kills-over-time`. The metric widget remains independently addable, removable, configurable, persisted, and shareable even though its data request is shared.

### 1. Confirm the data contract

`avg_kills` is already required by `AnalyticsGameStatsSchema` and present in `tests/fixtures/analytics-game-stats.ts`. Therefore an average-kills widget needs no transport, schema, query-key, or API fixture change.

For a future field that is not already in `AnalyticsGameStats`:

1. Confirm the real upstream field and numeric semantics.
2. Add it to the complete Zod row contract rather than creating a loose component type.
3. Add it to the complete fixture.
4. Prove valid preservation and malformed/missing rejection in schema and transport tests.

Unknown response fields are intentionally stripped until they become an explicit cache contract.

### 2. Add a dedicated panel

Follow `src/features/analytics/components/total-matches-over-time-panel.tsx`. A new panel should:

1. Call `useGameStats(settings)`.
2. Memoize `buildGameStatsMetricSeries(query.data ?? [], 'avg_kills')`.
3. Use `getChartWidgetPresentation(size, 640, 236)`.
4. Build the viewport key only from the three server filters.
5. Use `AnalyticsTimeSeriesFilterControls` in strip/overlay modes.
6. Render `GameStatsMetricChart` with average-kills label, color, precision, and tooltip copy.
7. Keep the five observable query states:
   - initial pending skeleton;
   - one-pixel refresh indicator while cached points remain;
   - no-data message;
   - blocking error with `query.refetch()` Retry;
   - `Data may be stale` banner when a refresh fails over cached points.
8. In summary mode, show the number of daily buckets and the latest exact metric value, then ask the user to resize taller.

Use metric-specific accessible text. The panel’s `aria-label`, visible title, loading label, error message, no-data copy, tooltip unit, and summary unit must agree.

The total-matches panel is the reference shell. Do not abstract it preemptively while implementing one new widget. If two or more metric panels have demonstrably identical state/rendering code after the second implementation, a small shared shell may be justified; preserve explicit metric configuration and query-state copy.

### 3. Add durable dashboard types

In `src/features/dashboard/dashboard-types.ts`:

1. Add the new string to `DashboardPanelType`.
2. Add a settings-bearing instance type using `GameStatsTimeSeriesSettings`.
3. Add the instance to `DashboardPanelInstance`.
4. Exclude it from `GeometryDashboardPanelInstance` because geometry-only records cannot retain its filters.

Reuse `createDefaultGameStatsTimeSeriesSettings()`: 30 days from current UTC midnight, all ranks `0..116`. Do not create a metric-specific default unless product behavior differs.

Persisted type strings are compatibility contracts. Once shipped, do not rename one just to change display copy.

### 4. Add manifest, preview, and registry lifecycle

In `src/features/dashboard/dashboard-panel-manifest.ts`, add title, description, and geometry. Time-series charts currently use `defaultW: 12` and `defaultH: 18`.

In `src/features/dashboard/dashboard-panel-registry.tsx`:

1. Add typed create and sanitize functions.
2. Reuse `isValidAnalyticsTimeSeriesSettings`.
3. Clone valid settings; reset the complete settings object to `createDefaultGameStatsTimeSeriesSettings()` when invalid.
4. Register a `LineWidgetPreview` with suitable sample points and axis labels.
5. Keep `previewSize: { width: 400, contentHeight: 158 }` and `renderWhileLoading: true`.
6. Pass settings changes through `onInstanceChange({ ...instance, settings })`.
7. Keep the widget out of `defaultDashboardLayout` unless product requirements explicitly change. Metric-history widgets are currently picker-only.

`LineWidgetPreview` already supports a single series, optional icon, custom three-value axis labels, and `showLegend={false}`. Reuse it rather than creating another SVG preview component.

### 5. Preserve local storage and share documents

A configurable widget needs explicit settings-bearing integration in all durable boundaries.

In `src/lib/api/schema.ts`:

1. Add a strict share-widget branch with the new literal type.
2. Use `AnalyticsTimeSeriesFilterSettingsSchema` for settings.
3. Add the branch to the V3 `ShareWidgetSchema` discriminated union.
4. Do not add it to the geometry-only widget enum used by V2.
5. Do not bump share or local-storage versions for another compatible V3 discriminant.

In `src/features/custom-pages/custom-page-state.ts`:

1. Extend `rebuildWidget` to clone the new settings object.
2. Extend `buildCustomPageShareDocument` to serialize settings with geometry.
3. Keep generic geometry-only widgets on the geometry-only branch.

The dashboard widget engine preserves settings through object spread, while each registry sanitizer validates hydration. Custom pages and share export use explicit branches; missing either branch silently loses configuration or fails type/schema validation.

## Verification strategy

### Cache/projection contract

Extend `tests/features/analytics/game-stats-timeseries.spec.ts` only when the shared behavior changes. Its existing cache test already proves that:

- identical filter options execute one transport request;
- the cached row retains `total_matches`, `avg_kills`, and other aggregates;
- projecting `total_matches` and `avg_kills` causes no extra request.

For a new already-modeled metric, add a focused projection assertion only if it has distinct behavior such as precision, allowed negative values, or special normalization. Do not duplicate the generic sorting/deduplication test for every field.

### Widget durability contract

Extend these tests for each new settings-bearing widget:

- `tests/features/dashboard/dashboard-panel-registry.spec.ts`
  - picker metadata and preview size;
  - default instance;
  - valid settings preservation;
  - invalid settings reset;
  - current-layout hydration;
  - omission from the default dashboard.
- `tests/features/custom-pages/custom-page-store.spec.ts`
  - save/restore without settings loss;
  - V3 export geometry and settings;
  - V3 import back to current geometry and settings.
- `tests/lib/api/shares.spec.ts`
  - strict V3 round trip;
  - malformed/unknown settings rejection;
  - V2 rejection of the configurable type.

If the metric requires a new API field, also extend:

- `tests/fixtures/analytics-game-stats.ts`;
- `tests/lib/api/schema.spec.ts`;
- `tests/lib/api/analytics.spec.ts`.

### Commands

Run the focused game-stats and durability contracts while editing:

```bash
bun run test -- --run tests/lib/api/schema.spec.ts tests/lib/api/analytics.spec.ts tests/features/analytics/game-stats-timeseries.spec.ts tests/features/dashboard/dashboard-panel-registry.spec.ts tests/features/custom-pages/custom-page-store.spec.ts tests/lib/api/shares.spec.ts
```

Before delivery:

```bash
bun run test -- --run
bun run lint
bun run build
```

UI verification in this repository uses source review, behavioral tests, lint, and the production build. Do not introduce browser automation or start a dev server solely to inspect or screenshot the chart.

## Failure modes to avoid

- **Metric-specific request or query key:** duplicates network/cache data already returned by game stats.
- **Query-level `select`:** changes the cached contract from the complete reusable row array to one widget’s projection.
- **Putting metric names in the key:** prevents widgets with identical filters from sharing fresh data.
- **Using `DashboardDataBundle`:** inherits unrelated aggregate-dashboard freshness and error-to-empty behavior.
- **Omitting a server filter from the key:** can render cached data under the wrong visible filter label.
- **Adding renderer-only state to the key:** fragments cache entries without changing the response.
- **Mutating/sorting query data in place:** corrupts the shared cache value seen by other widgets.
- **Dropping zero values:** zero is valid for counts and averaged metrics.
- **Fitting the viewport on every refresh:** destroys user pan/zoom state.
- **Treating configurable widgets as geometry-only:** loses settings during hydration or sharing.
- **Adding a configurable type to V2:** breaks the geometry-only share contract.
- **Copying color parsing or filter controls:** creates divergent chart behavior and theme bugs.
- **Adding a widget to the default layout unintentionally:** changes existing users’ dashboards after hydration/default resolution.

## Completion checklist

- [ ] Metric exists in the complete validated game-stats row.
- [ ] Existing `useGameStats` and key are reused without projection.
- [ ] Points come from `buildGameStatsMetricSeries`.
- [ ] Rank/date controls use `AnalyticsTimeSeriesFilterControls`.
- [ ] Chart uses `GameStatsMetricChart` with correct unit and precision.
- [ ] All pending, refreshing, empty, blocking-error, and stale-data states exist.
- [ ] Summary, compact-chart, and full-chart presentations work from the shared responsive helper.
- [ ] Widget type, settings-bearing instance, manifest, registry lifecycle, and preview are registered.
- [ ] Widget remains picker-only unless explicitly requested otherwise.
- [ ] Dashboard hydration, custom-page persistence, and V3 sharing preserve settings.
- [ ] Focused contracts, full tests, lint, and build pass.
