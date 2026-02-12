# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/` with feature slices under `src/features/` and shared UI in `src/ui/`.
- Routes are file-based via TanStack Router in `src/routes/`; `src/routeTree.gen.ts` is generated.
- API client code is in `src/lib/api/`; shared utilities in `src/lib/utils/`.
- Static assets live in `public/`.
- Tests live in `tests/` with Vitest specs mirroring `src/` features.
- Docs live in `docs/` (see `docs/project-overview.md` for architecture details).

## Build, Test, and Development Commands
- Install deps with `bun install`.
- Start dev server: `bun run dev`.
- Production build: `bun run build` (outputs to `dist/`).
- Preview build: `bun run preview`.
- Lint: `bun run lint`.
- Test: `bun test` (Vitest).

## Coding Style & Naming Conventions
- TypeScript + React; follow existing ESLint rules and formatting in nearby files.
- Prefer the `@/` alias for `src/` imports when it keeps paths shorter.
- Keep route filenames aligned with TanStack Router file-based conventions.

## Testing Guidelines
- Place specs in `tests/` with `*.spec.ts` naming.
- Keep tests deterministic; prefer data fixtures over live API calls.

## Commit & Pull Request Guidelines
- Use concise, imperative commit subjects; keep titles short and descriptive.
- Summaries should explain why the change was made when helpful.

## Security & Configuration Tips
- Do not commit secrets. Document new environment variables in `README.md`.
- Vite reads env vars prefixed with `VITE_` (e.g., `VITE_DEADLOCK_API_BASE`).
