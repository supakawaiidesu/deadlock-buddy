# Game-Stats Overlay Chart Implementation Guide

This guide records the architecture of the **Game stats over time** dashboard widget. The widget keeps the durable `total-matches-over-time` type for existing saved layouts, but now lets users select up to eight `/v1/analytics/game-stats` metrics and overlay them on one chart.

The key decision is the cache boundary: `/v1/analytics/game-stats` returns every aggregate in one validated row. TanStack Query stores that complete response under the server filters. Changing the selected metrics projects different fields from the same cached array and never issues a metric-specific request.

For hero-specific history, use `docs/chart-widget.md`. That endpoint, cache shape, and hero-selection behavior are intentionally separate.

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

Game-stats widgets reuse `createDefaultGameStatsTimeSeriesSettings()`, which selects `total_matches` initially and stores the selected `metrics` alongside the rank/date filters.

### Shared multi-series chart

`src/features/analytics/components/game-stats-metric-chart.tsx` owns Lightweight Charts for the selected endpoint metrics. Each series supplies its metric ID, projected points, label, color, precision, and exact tooltip formatter.

Keep these chart invariants:

- one selected metric uses the right axis with its absolute domain and metric-specific formatter;
- two selected metrics use separate absolute domains: the first selected metric on the left axis and the second on the right;
- three or more selected metrics share the right axis in Lightweight Charts `Percentage` mode, measured from each series' first visible value;
- percentage-mode tooltips show each exact raw value plus its percentage change from the same visible baseline;
- the left price scale is visible only for exactly two selected metrics;
- automatic y-axis scaling;
- UTC time-axis labels and tooltip dates;
- mouse/touch pan and zoom;
- `fitContent()` only when a server filter or selected metric changes;
- preservation of the visible time range during same-settings refreshes;
- concrete CSS color resolution through `lightweight-chart-colors.ts` whenever the theme changes;
- frame-edge-clamped tooltip positioning;
- exact subscription cleanup and `chart.remove()` on unmount;
- `.analytics-time-series-chart-host` for the shared Lightweight Charts table fix;
- visible TradingView attribution.

Lightweight Charts exposes one visible scale per side. Exactly two unlike units therefore remain readable on separate absolute axes. Arbitrary scale IDs create auto-scaled overlay scales but do not render additional axes, so three or more series move to the right-side percentage scale instead of presenting unlike values on one absolute domain. The full TradingView product's stacked same-side axes are not available in the Lightweight Charts API.

## Adding or changing a selectable metric

`src/features/analytics/lib/game-stats-metrics.ts` is the complete display catalog for numeric `AnalyticsGameStats` fields other than `bucket`. Add a label and domain format there when the API schema gains a field. The catalog determines selector copy, tooltip formatting, axis precision, and validates persisted metric IDs.

For a future field that is not already in `AnalyticsGameStats`:

1. Confirm the real upstream field and numeric semantics.
2. Add it to the complete Zod row contract rather than creating a loose component type.
3. Add it to the complete fixture.
4. Add its label and format to `GAME_STATS_METRIC_DEFINITIONS`.
5. Prove schema validation, transport preservation, catalog coverage, and display formatting.

Persisted widget settings contain `metrics`; registry hydration and V3 share parsing require one to eight unique known IDs. Legacy saved `total-matches-over-time` settings without `metrics` migrate to `['total_matches']`. Keep the existing widget type stable: persisted type strings are compatibility contracts.

`GameStatsOverTimePanel` owns the third filter, selected-series legend/focus controls, responsive states, and all query states. The selected metrics do not belong in the query key because they do not change the server response. They do belong in the viewport reset key because changing visible series should fit the new comparison.

`src/features/custom-pages/custom-page-state.ts` must clone and serialize the metrics array. `GameStatsTimeSeriesSettingsSchema` must remain the strict V3 share contract. The widget remains excluded from V2's geometry-only type enum and from the default dashboard layout.

## Verification strategy

### Cache/projection contract

Extend `tests/features/analytics/game-stats-timeseries.spec.ts` only when the shared behavior changes. Its existing cache test already proves that:

- identical filter options execute one transport request;
- the cached row retains `total_matches`, `avg_kills`, and other aggregates;
- projecting `total_matches` and `avg_kills` causes no extra request.

For a new already-modeled metric, add a focused projection assertion only if it has distinct behavior such as precision, allowed negative values, or special normalization. Do not duplicate the generic sorting/deduplication test for every field.

### Widget durability contract

The existing configurable-widget tests must cover:

- `tests/features/analytics/game-stats-metrics.spec.ts`
  - every validated metric appears in the catalog exactly once;
  - count, decimal, duration, and rate formatting;
- `tests/features/dashboard/dashboard-panel-registry.spec.ts`
  - picker metadata and preview size;
  - default selection;
  - valid selection preservation;
  - invalid and duplicate selection reset;
  - legacy settings migration to `total_matches`;
  - current-layout hydration and omission from the default dashboard;
- `tests/features/custom-pages/custom-page-store.spec.ts`
  - save/restore without selection loss;
  - V3 export/import with metrics and geometry;
- `tests/lib/api/shares.spec.ts`
  - strict V3 round trip;
  - empty, duplicate, malformed, and unknown metric rejection;
  - V2 rejection of the configurable type.

If the metric requires a new API field, also extend:

- `tests/fixtures/analytics-game-stats.ts`;
- `tests/lib/api/schema.spec.ts`;
- `tests/lib/api/analytics.spec.ts`.

### Commands

Run the focused game-stats and durability contracts while editing:

```bash
bun run test -- --run tests/lib/api/schema.spec.ts tests/lib/api/analytics.spec.ts tests/features/analytics/game-stats-timeseries.spec.ts tests/features/analytics/game-stats-metrics.spec.ts tests/features/dashboard/dashboard-panel-registry.spec.ts tests/features/custom-pages/custom-page-store.spec.ts tests/lib/api/shares.spec.ts
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

- [ ] Metric catalog covers every validated game-stats value.
- [ ] Existing `useGameStats` and key are reused without metric projection.
- [ ] Each selected metric is projected with `buildGameStatsMetricSeries`.
- [ ] Rank/date/stat controls share the existing responsive filter shell.
- [ ] One metric uses the right absolute scale; two use left/right absolute scales; three or more use right-side percentage comparison.
- [ ] Percentage-mode tooltips show exact values and change from the first visible point.
- [ ] All pending, refreshing, empty, blocking-error, stale-data, summary, compact-chart, and full-chart states exist.
- [ ] Existing `total-matches-over-time` records migrate without changing the durable type.
- [ ] Dashboard hydration, custom-page persistence, and V3 sharing preserve selected metrics.
- [ ] Focused contracts, full tests, lint, and build pass.
