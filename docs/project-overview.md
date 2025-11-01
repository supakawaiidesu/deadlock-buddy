# 618Lock – Engineering Overview

This document captures the current state of the codebase so future work can resume without re‑establishing context.

## Runtime & Tooling
- **Framework:** Next.js 15 (App Router) with TypeScript.
- **Packages:**  
  - Data fetching: `@tanstack/react-query` (with persistence scaffold).  
  - Validation: `zod`.  
  - Charts: `recharts`.  
  - UI helpers: Tailwind CSS v4, shadcn primitives, Framer Motion.
- **Testing:** Vitest (unit), groundwork for RTL/Playwright not yet added.
- **Commands:**  
  - `npm run dev` – start dev server (run from Windows terminal or enable `CHOKIDAR_USEPOLLING=1` if using WSL).  
  - `npm run build`, `npm run lint`, `npm test`.

## Project Structure
- `src/app/` – App Router entrypoints, global styling, shell layout.
- `src/ui/` – Shared UI primitives (`AppShell`, `Panel`, `Stat`, `Skeleton`).
- `src/features/players/` – Player-focused logic (queries, metrics transforms).
- `src/features/player-profile/` – Composed player profile components.
- `src/features/player-search/` – Account lookup form.
- `src/features/navigation/` – Top/side navigation components.
- `src/lib/api/` – Deadlock API client, schemas, rate limiting, fetch helpers.
- `src/lib/utils/` – Formatting helpers.
- `docs/` – Data model reference and this overview.
- `tests/` – Vitest specs (currently player metrics helpers).

## Global Styling & Layout
- **Theme:** Terminal-inspired dark palette, sharp edges (no border radius), primary accent `#3fc96d`.
- **Spacing:** 2 px grid rhythm across panels, nav, and pages. The `AppShell` enforces a consistent gutter (`2px` padding top/bottom/left/right).
- **Typography:** Inter (body) + Space Grotesk (display) via `next/font`.
- **Layout:**  
  - Top nav bar (search + navigation links).  
  - Left vertical nav (section links).  
  - Main content column fills remaining width/height; panels arranged via CSS grids with 2 px gaps.

## Player Experience (MVP)
- `/players` – Lookup screen with strict input validation routing to player view.
- `/players/[accountId]` – Player profile: overview stats, score momentum chart, hero performance table, profile signals, top heroes.
- `/` – Landing copy aligned with the terminal aesthetic and navigation.

### Player Data Flow
1. React Query hooks in `src/features/players/api/queries.ts` call Deadlock API endpoints (MMR, MMR history, hero stats).
2. Responses validated via Zod schemas (`src/lib/api/schema.ts`).
3. Metrics helpers (`src/features/players/lib/metrics.ts`) derive aggregate stats (win rate, top heroes, etc.).
4. Player profile component renders data in tightly arranged panels with Recharts for score history.

### Rate Limiting
- Central fetch wrapper throttles to 5 req/s (token bucket) to respect upstream API recommendations (`src/lib/api/rate-limit.ts`).

## Navigation & Shell
- `TopNav` (search input + global links) uses App Router navigation.
- `SideNav` holds placeholder links for future sections (heroes, meta, etc.).
- `AppShell` composes navs with the content grid and enforces uniform padding.

## Testing Snapshot
- `tests/features/players/metrics.spec.ts` covers metric helpers.
- `npm test -- --run` executes current suite; expand with component/integration tests as features grow.

## Known Follow-ups / Ideas
- Populate hero metadata (names, roles, imagery) to replace ID placeholders.
- Extend React Query persistence and add offline caching strategy.
- Flesh out `/heroes`, `/meta`, `/leaderboards` pages.
- Add integration tests (Playwright) once flows stabilize.
- Implement hero comparisons, build analytics, and more API endpoints.

Keep this document up to date as new features land to maintain continuity across sessions.

