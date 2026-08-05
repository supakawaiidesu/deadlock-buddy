# 618Lock – Engineering Overview

This document captures the current state of the codebase so future work can resume without re-establishing context.

## Runtime & Tooling
- **Package manager:** Bun (lockfile: `bun.lock`).
- **Framework:** Vite (client-side SPA) with React 19 and TypeScript.
- **Routing:** TanStack Router (file-based, routes in `src/routes/`).
- **Packages:**
  - Data fetching: `@tanstack/react-query` v5 with localStorage persistence (30 min TTL).
  - Validation: `zod`.
  - Charts: `recharts`.
  - Drag-and-drop: `@dnd-kit/core`, `@dnd-kit/sortable`.
  - UI helpers: Tailwind CSS v4 (CSS-first config, `@tailwindcss/postcss`), shadcn primitives, Framer Motion.
- **Testing:** Vitest (unit), groundwork for RTL/Playwright not yet added.
- **Linting:** ESLint with `typescript-eslint` flat config.
- **Commands:**
  - `bun run dev` – start Vite dev server.
  - `bun run build` – production build to `dist/`.
  - `bun run preview` – preview production build.
  - `bun run lint`, `bun test`.

## Project Structure
- `src/routes/` – TanStack Router file-based routes (`__root.tsx`, `index.tsx`, `heroes/`, `players/`).
- `src/routeTree.gen.ts` – Auto-generated route tree (do not edit manually).
- `src/main.tsx` – App entry point (`createRoot` + `RouterProvider`).
- `src/providers.tsx` – React Query client + persister setup.
- `src/globals.css` – Tailwind v4 imports and CSS custom properties.
- `src/ui/` – Shared UI primitives (`AppShell`, `Panel`, `Stat`, `Skeleton`).
- `src/features/dashboard/` – Dashboard layout, panel registry, drag-and-drop grid, React Query hooks.
- `src/features/heroes/` – Hero overview table, hero detail, leaderboard panel, React Query hooks.
- `src/features/players/` – Player-focused logic (queries, metrics transforms).
- `src/features/player-profile/` – Composed player profile components.
- `src/features/player-search/` – Account lookup form.
- `src/features/navigation/` – Top/side navigation components (TanStack Router `Link`).
- `src/features/analytics/` – Rank distribution and filterable leaderboard panels.
- `src/features/items/` – Item leaderboard panel.
- `src/lib/api/` – Deadlock API client, schemas, rate limiting, fetch helpers.
- `src/lib/utils/` – Formatting helpers.
- `docs/` – Data model reference and this overview.
- `tests/` – Vitest specs (currently player metrics helpers).
- `public/` – Static assets (favicon).

## Configuration Files
- `vite.config.ts` – Vite config with `@vitejs/plugin-react`, `TanStackRouterVite` plugin, `@` path alias.
- `postcss.config.mjs` – Tailwind CSS v4 via `@tailwindcss/postcss`.
- `tsconfig.json` – Strict TypeScript with `"jsx": "react-jsx"`, `"types": ["vite/client"]`.
- `eslint.config.mjs` – Flat config with `typescript-eslint`.
- `index.html` – Vite SPA entry point at project root.

## Environment Variables
- `VITE_DEADLOCK_API_BASE` – Base URL for Deadlock API (default: `https://api.deadlock-api.com`).

## Global Styling & Layout
- **Theme:** Terminal-inspired dark palette, sharp edges (no border radius), primary accent `#3fc96d`.
- **Spacing:** 2 px grid rhythm across panels, nav, and pages. The `AppShell` enforces a consistent gutter.
- **Typography:** Inter (body) + Space Grotesk (display) loaded via CSS `@font-face`.
- **Layout:**
  - Top nav bar (search + navigation links).
  - Left vertical nav (section links).
  - Main content column fills remaining width/height; panels arranged via CSS grids with 2 px gaps.

## Routes
- `/` – Dashboard with drag-and-drop panel grid (hero leaderboard, NA leaderboard, item leaderboard, rank distribution).
- `/heroes` – Hero overview table with sortable columns.
- `/heroes/$slug` – Hero detail page with stats and leaderboard.
- `/players` – Account lookup form.
- `/players/$accountId` – Player profile: overview stats, match activity grid, hero performance table, and paged enriched match history.

### Data Flow
1. React Query hooks in `src/features/*/api/queries.ts` call Deadlock API endpoints.
2. Responses validated via Zod schemas (`src/lib/api/schema.ts`).
3. Metrics helpers derive aggregate stats (win rate, top heroes, etc.).
4. Components render data in tightly arranged panels with Recharts for charts.

### Rate Limiting
- Central fetch wrapper throttles to 5 req/s (token bucket) to respect upstream API recommendations (`src/lib/api/rate-limit.ts`).

## Testing Snapshot
- `tests/features/players/metrics.spec.ts` covers metric helpers.
- `tests/features/player-profile/match-history.spec.ts` covers enriched match rows, final builds, team identity, and lightweight fallbacks.
- `bun test -- --run` executes current suite; expand with component/integration tests as features grow.

## Known Follow-ups / Ideas
- Code-split large chunks (current bundle is ~6.5 MB unminified).
- Extend React Query persistence and add offline caching strategy.
- Flesh out `/meta`, `/leaderboards`, `/patches` pages (nav links exist, routes not yet created).
- Add integration tests (Playwright) once flows stabilize.
- Implement hero comparisons, build analytics, and more API endpoints.
- Explore Bun as test runner (replace Vitest with `bun test` once ecosystem matures).

Keep this document up to date as new features land to maintain continuity across sessions.
