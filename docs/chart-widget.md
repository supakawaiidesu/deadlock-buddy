# Hero Win Rate History Widget Development Guide

The dashboard entry is named **Hero win rate over time**, while its persisted type remains `hero-winrate-over-time`. The display name can change independently; keep the persisted type stable because it is stored in dashboard/custom-page localStorage and in shared page documents.

## Main files

- `src/features/heroes/components/hero-winrate-over-time-panel.tsx` — filters, hero selector, tracked-hero overlay, query states, and composition of the canvas adapter.
- `src/features/heroes/components/hero-winrate-lightweight-chart.tsx` — Lightweight Charts lifecycle, line-series diffing, native interaction, canvas theme repaint, tooltip overlay, and TradingView attribution.
- `src/features/heroes/lib/winrate-timeseries.ts` — pure compact, selected-series, and sparse union-timeline transforms. API rows become compact cache data here; inputs are never mutated.
- `src/features/heroes/api/queries.ts` — React Query key, request, compact cache boundary, and per-instance `select`.
- `src/lib/api/analytics.ts` — `/v1/analytics/hero-stats` query serialization. This endpoint intentionally uses the official upstream rather than the proxy.
- `src/lib/api/schema.ts` — full upstream row validation plus strict v3 share settings validation.
- `src/features/dashboard/dashboard-types.ts` — durable widget settings and defaults.
- `src/features/dashboard/dashboard-panel-registry.tsx` — settings validation/hydration and widget renderer registration.
- `src/features/custom-pages/custom-page-state.ts` — local page cloning, storage, share export, and import.
- `src/globals.css` — `--chart-series-1` through `--chart-series-8`.

## Safe presentation changes

Axis labels, internal margins, grid lines, tooltip layout, and line appearance are local to `hero-winrate-lightweight-chart.tsx`. Keep:

- `autoSize: true` with the host’s initial width and height as its fallback. Lightweight Charts owns the only resize observer so widget preview and committed width/height changes are both followed.
- Native body panning, wheel/pinch time zoom, and price/time axis drag and double-click reset. Keep `vertTouchDrag: false` so vertical touch gestures can scroll the page.
- The initial fixed 25%–75% compact right price range, right-side y-axis, and dashed 50% reference price line. After the initial range, Lightweight Charts owns user price-scale state.
- `fitContent()` only for first data sync or a changed server-filter/hero-selection viewport key. Background refetches must preserve the visible time range.
- One `LineSeries` per selected hero, updated in place. Sparse union rows become whitespace data; never interpolate missing hero buckets.
- Straight solid lines without static point markers, 3px crosshair markers, deterministic hero colors, and percentage price formatting.
- Concrete computed colors for canvas options. Re-resolve every theme-dependent token and `color-mix(...)` expression when `useTheme().themeId` changes.
- The React tooltip overlay’s UTC date, selected-hero row order, wins–losses and match counts, and frame-edge clamping.
- StrictMode-safe cleanup: unsubscribe the exact crosshair handler, remove the reference line before its owner, clear refs, and remove the chart once.
- `layout.attributionLogo: true` plus the root `NOTICE`; together they preserve the Lightweight Charts distribution notice and user-visible TradingView link.
- UTC day interpretation for API buckets and the Since input, and controls that remain usable during error and empty states.

The tracked-hero icons remain the interaction surface for emphasis. The stack stays left of the right-side price axis and uses reverse row flow so each newly selected hero is added on the left. Hover/focus sets `focusedHeroId`, thickens that line to 3px, and resolves other lines at 16% opacity without rebuilding series or resetting either scale. Keep the new time-series adapter specific to this widget; `RankDistributionPanel` remains a separate Recharts bar chart.

## Adding a server-side filter

A filter that changes the upstream response must be added everywhere below:

1. Add the durable field to `HeroWinrateOverTimeSettings` and its default in `dashboard-types.ts`.
2. Validate it in `isValidChartSettings` in `dashboard-panel-registry.tsx`. A malformed settings object falls back as a unit to defaults.
3. Add it to `HeroWinrateOverTimeSettingsSchema` in `schema.ts`; share objects are strict.
4. Add it to `HeroStatsFilters` and serialize the exact API query parameter in `analytics.ts`.
5. Add it to `heroWinrateTimeSeriesQueryKey` in `queries.ts`. Missing a server filter from the key can display cached data for the wrong label.
6. Pass it from settings into `filters` in `useHeroWinrateTimeSeries`.
7. Add the control in the panel and commit through `onSettingsChange`.
8. Update API, query-key, persistence, share, malformed-settings, and reload/import tests.

Do not add `heroIds` to the query key or request. The endpoint returns all heroes; selections are client-side and deliberately share one cached response for identical server filters.

## Adding a client-only option

For an option that changes only rendering or selection:

- Component-local ephemeral behavior, such as the currently hovered hero, stays in component state.
- Behavior that must survive reload/share belongs in `HeroWinrateOverTimeSettings`, registry validation, and the v3 share settings schema.
- If it only changes `buildHeroWinrateSeries`, keep it out of the query key unless it changes the server response.

## Adding another metric or chart mode

The current compact cache contains `heroId`, `time`, `wins`, `losses`, and `matches`. A mode derived from those fields can reuse the existing request and cache. Add the durable mode setting, derive selected series and its sparse timeline in pure helpers, and select the renderer in the panel.

A metric requiring another upstream `total_*` field needs that field copied into `HeroWinrateDatum`. The full upstream Zod schema already validates all required totals, but compact data intentionally drops unused fields before query-cache persistence.

If a future mode uses a different endpoint or materially different server parameters, give it a distinct query-key namespace. Do not overload the current key with incompatible response shapes.

## Persistence and compatibility

- Standalone dashboard, heroes, player-profile, and custom-page keys use `.v2`; each explicitly migrates its corresponding three-column `.v1` value without deleting the legacy key.
- Local widget geometry uses 12 columns and persists intermediate one-twelfth widths exactly.
- Share creation remains profile v3 because chart widgets contain settings. Export conservatively expands local geometry to the legacy thirds it touches.
- Share fetch/import accepts geometry-only v2 and configurable v3 profiles; both are migrated from three columns before current sanitization.
- Legacy chart records without settings receive current defaults during hydration.
- Moving/resizing relies on object spread and must preserve `settings`; chart interactions survive layout changes.

## Verification

Run focused contracts while editing:

```bash
bun run test -- --run tests/lib/api/schema.spec.ts tests/lib/api/client.spec.ts tests/lib/api/analytics.spec.ts tests/features/heroes/winrate-timeseries.spec.ts
bun run test -- --run tests/features/widgets/widget-layout.spec.ts tests/features/custom-pages/custom-page-store.spec.ts tests/features/custom-pages/custom-page-navigation.spec.ts tests/lib/api/shares.spec.ts tests/features/dashboard/dashboard-panel-registry.spec.ts
```

Before delivery:

```bash
bun run test -- --run
bun run lint
bun run build
```

For a new server filter, also inspect the exercised request URL and verify the query value, cache-key value, visible label, and persisted/share value all agree.
