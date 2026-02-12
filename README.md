# Deadlock Buddy (618Lock)

Player insights and hero analytics for Valve's Deadlock. Client-side SPA built with Vite, React 19, and TypeScript.

## Requirements

- Bun (package manager/runtime)

## Getting Started

```bash
bun install
bun run dev
```

Open http://localhost:5173 in your browser.

## Stack

- Vite SPA + React 19 + TypeScript
- Routing: TanStack Router (file-based in `src/routes/`)
- Data: TanStack Query with localStorage persistence (30 min TTL)
- Styling: Tailwind CSS v4 (CSS-first config)
- Animation: Framer Motion
- Testing: Vitest
- Linting: ESLint (typescript-eslint flat config)

## Scripts

- `bun run dev` - start the Vite dev server
- `bun run build` - production build to `dist/`
- `bun run preview` - preview the production build
- `bun run lint`
- `bun test`

## Project Structure

- `src/main.tsx` - app entry point (createRoot + RouterProvider)
- `src/providers.tsx` - React Query client + persistence
- `src/routes/` - TanStack Router file-based routes
- `src/routeTree.gen.ts` - auto-generated route tree (do not edit)
- `src/globals.css` - Tailwind v4 imports + CSS variables
- `vite.config.ts` - Vite + TanStack Router plugin setup
- `index.html` - Vite SPA entry point
- `public/` - static assets
- `tests/` - Vitest specs

## Environment Variables

- `VITE_DEADLOCK_API_BASE` - base URL for the Deadlock API (default: https://api.deadlock-api.com)

## Docs

- `docs/project-overview.md` - architecture, routes, and runtime details
- `docs/data-model.md` - API schema notes and data transforms
