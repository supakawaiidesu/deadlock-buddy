# Repository Guidelines

## Project Overview

Deadlock Buddy (also called 618Lock) is a private, client-side SPA for Valve's Deadlock. It presents player insights, hero analytics, leaderboards, rank distributions, and a configurable dashboard. The stack is Vite, React 19, TypeScript, TanStack Router, TanStack Query, Zod, Recharts, dnd-kit, Framer Motion, and Tailwind CSS v4.

## Architecture & Data Flow

- `index.html` mounts `src/main.tsx`. The entry point creates a typed TanStack Router from the generated `src/routeTree.gen.ts` and renders it under React `StrictMode`.
- `src/routes/__root.tsx` wraps every route in `AppProviders` and `AppShell`, then renders the route `Outlet`. Router devtools are development-only.
- Routes currently are `/`, `/players`, `/players/$accountId`, `/heroes`, and `/heroes/$slug`. Add or move route files under `src/routes/`; the Vite TanStack Router plugin regenerates `src/routeTree.gen.ts`.
- Route components compose feature components. Feature query hooks under `src/features/*/api/queries.ts` call endpoint modules in `src/lib/api/`, which use `src/lib/api/client.ts` and validate responses with Zod schemas in `src/lib/api/schema.ts`.
- Pure feature helpers then derive display metrics such as win rate, KDA, score deltas, pick rate, tiers, and aggregate records. Components render those results in shared panels, tables, and Recharts visualizations. Do not pass unvalidated API payloads directly into UI code.
- The dashboard fetches leaderboard, hero, item, and rank-distribution data concurrently. Its query layer intentionally converts an individual endpoint failure to an empty result; preserve that behavior unless the product contract changes.
- Player history is filtered for usable numeric timestamps/scores, sorted ascending, and given client-derived score deltas. Player and hero routes use local JSON catalogs to map API IDs to display names, slugs, and icons.
- React Query owns remote/cache state. Local component state and memoized selectors handle UI state; there is no Redux, Zustand, or dependency-injection container. Dashboard panel order is sanitized and persisted in localStorage under `deadlock-buddy-dashboard-layout.v1`.
- The query cache is persisted under `deadlock-buddy-query-cache` for 30 minutes; queries are stale after 5 minutes, garbage-collected after 1 hour, do not refetch on window focus, and retry up to three times except for HTTP 404s.
- All API calls pass through the shared token bucket in `src/lib/api/rate-limit.ts` (5 requests/second). `ApiError` preserves HTTP status and response data for non-2xx responses.

## Key Directories

- `src/routes/` — TanStack Router file-based route modules. Dynamic segments use `$param` filenames.
- `src/features/` — Feature slices: `dashboard`, `heroes`, `players`, `player-profile`, `player-search`, `analytics`, `items`, and `navigation`; API hooks and feature-specific components stay near their feature.
- `src/ui/` — Shared visual primitives such as `AppShell`, `Panel`, `Stat`, and `Skeleton`.
- `src/lib/api/` — API client, endpoint wrappers, Zod schemas, and rate limiting.
- `src/lib/data/` — Static ID catalogs. The source filename is intentionally `heros.json` (misspelled); `heroes.ts` and `items.ts` adapt the JSON for UI use.
- `src/lib/utils/` — Shared formatting helpers.
- `tests/` — Vitest specs arranged to mirror source feature paths.
- `docs/` — Engineering overview and API/data-model notes; verify details against current source when they conflict.
- `public/` — Static assets copied by Vite. There is no `scripts/` directory; project commands live in `package.json`.

## Development Commands

Run commands with Bun:

```bash
bun install
bun run dev
bun run build
bun run preview
bun run lint
bun run test
bun run test -- --run tests/features/players/metrics.spec.ts
```

`bun run dev` starts Vite at `http://localhost:5173`; `build` writes the production bundle to `dist/`; `preview` serves that bundle. The package's `test` script is Vitest. README/docs also show `bun test` and `bun test -- --run`; use the explicit package-script form when forwarding Vitest flags.

## Code Conventions & Common Patterns

- Use strict TypeScript and the `@/` alias for `src/` imports. Keep `noEmit`, bundler resolution, and the existing `react-jsx` setup intact.
- Use functional React components and hooks. Name components/types in PascalCase, functions/variables in camelCase, hooks with a `use` prefix, and route parameters with TanStack's `$param` convention.
- Keep API access in `src/lib/api/` and query orchestration in feature `api/queries.ts` files; UI components should consume hooks rather than call `fetch` directly.
- Define stable query-key factories, guard invalid IDs with `enabled`, and use React Query `select` or pure helpers for derived data. Copy arrays before sorting or otherwise mutating them.
- Validate external payloads with the existing Zod schemas. Normalize nullable/string numeric fields at the schema/API boundary and preserve `ApiError` status/body information.
- Guard aggregate calculations against zero matches/deaths and keep transformations deterministic. Prefer small pure helpers for calculations so they can be tested without React or browser APIs.
- Follow existing loading/error/empty states. Note that dashboard endpoint errors degrade to empty panels, while player/profile queries expose their own loading and error states; do not silently change these semantics.
- Use Tailwind CSS v4's CSS-first setup in `src/globals.css` and the existing shared UI primitives. No legacy `tailwind.config.*` or Prettier configuration exists.
- ESLint uses flat config with recommended JavaScript and TypeScript rules. Unused variables and explicit `any` are warnings; prefix intentionally unused arguments with `_`.
- There is no broad dependency-injection or global state pattern. Keep new boundaries consistent with module imports, React Query, local state, and pure functions rather than adding a new store or container.

## Important Files

- `package.json` — authoritative scripts and dependency metadata.
- `index.html` — SPA shell and root element.
- `src/main.tsx` — application entry and router registration.
- `src/routes/__root.tsx` — providers, shell, outlet, and devtools wiring.
- `src/routeTree.gen.ts` — generated route tree; never edit manually.
- `src/providers.tsx` — QueryClient defaults and localStorage persistence.
- `src/lib/api/client.ts` — base URL, fetch behavior, JSON/text handling, and `ApiError`.
- `src/lib/api/schema.ts` — Zod response schemas and normalization.
- `src/lib/api/rate-limit.ts` — shared token-bucket throttling.
- `src/features/dashboard/api/queries.ts`, `src/features/heroes/api/queries.ts`, and `src/features/players/api/queries.ts` — representative query/data-flow entry points.
- `src/features/dashboard/components/dashboard-layout.tsx` — drag/reorder/remove/add behavior and dashboard-layout persistence.
- `src/features/players/lib/metrics.ts` — pure player metric transformations and a model for testable domain logic.
- `src/lib/data/heros.json`, `src/lib/data/items.json`, `src/lib/data/heroes.ts`, and `src/lib/data/items.ts` — local display metadata.
- `vite.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, and `vitest.config.ts` — build, compiler, styling, lint, and test configuration.

The generated route tree and source files are the source of truth when docs disagree. Navigation currently advertises `/meta`, `/leaderboards`, and `/patches`, but those routes are not present in the generated tree; do not assume a navigation link means a route exists.

## Runtime/Tooling Preferences

- Bun is the required package manager/runtime for repository workflows; preserve `bun.lock`. No Node lockfile or runtime version pin is present.
- This is a browser-first Vite SPA with no SSR/server adapter, Dockerfile, CI workflow, or deployment descriptor in the repository.
- Vite, Vitest, and TypeScript all resolve `@` to `src/`; keep aliases synchronized if configuration changes.
- Tailwind v4 runs through `@tailwindcss/postcss`; styling is CSS-first rather than `tailwind.config.*`-based.
- The only documented environment variable is `VITE_DEADLOCK_API_BASE`, defaulting to `https://api.deadlock-api.com`. Vite variables are client-visible; use `.env*` locally and never commit secrets. No env template is checked in.
- `dist/`, `build/`, coverage output, `.env*`, and dependency directories are ignored. Treat `src/routeTree.gen.ts` as generated output and regenerate it through Vite/TanStack Router rather than hand-editing it.

## Testing & QA

- Vitest is the only configured test framework. Tests run in the Node environment with the `@` alias and `globals: true`; existing specs still explicitly import `describe`, `expect`, and `it`.
- Place new specs under `tests/` with `*.spec.ts`, mirroring the relevant `src/` path. Prefer deterministic inline/data fixtures over live API calls.
- The current checked-in suite is `tests/features/players/metrics.spec.ts`, covering pure player metric transforms. There are no component, browser, integration, API-contract, persistence, or end-to-end tests.
- No jsdom, React Testing Library, Playwright, MSW, mock server, test setup file, coverage provider, reporter, or coverage threshold is configured. `/coverage` is ignored, but `--coverage` is not a repository-defined workflow.
- For browser/provider/API tests, add an explicit harness or mocks: providers touch `window.localStorage` at module load and the rate limiter starts a shared interval at module load. Keep such tests isolated and deterministic.
- When changing pure transforms, cover boundary behavior such as zero matches, zero deaths, empty input, tie ordering, limits, and non-mutation. For query/API changes, test filtering, sorting, error/status behavior, schema normalization, and query-key semantics at the appropriate seam.
- Before delivering a behavioral change, run the focused Vitest spec plus `bun run lint` and `bun run build` as appropriate; use `bun run test -- --run` for the full current suite.
