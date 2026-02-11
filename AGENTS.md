# Repository Guidelines

## Project Structure & Module Organization
Maintain all core deadlock detection logic in `src/`, grouped by domain (e.g., `graph/`, `analysis/`, `ui/`). Shared utilities live in `src/lib/`. Place command-line entry points under `src/cli/` and keep reproducible scenarios in `examples/`. Manual assets like diagrams belong in `docs/`. Tests reside in `tests/` mirroring the `src/` tree, and fixtures or mock traces go in `tests/fixtures/` for reuse.

## Build, Test, and Development Commands
Run `npm install` after cloning to sync dependencies. Use `npm run build` to compile TypeScript to `dist/` and confirm the project still publishes cleanly. During development run `npm run dev` for a watch-mode rebuild that restarts the CLI on file changes. Before pushing code, run `npm run lint` and `npm test` locally to surface formatting or logic regressions early.

## Coding Style & Naming Conventions
Write all implementation code in TypeScript with strict compiler options enabled. Use 2-space indentation, single quotes, and trailing commas where valid. Name files with dashed-kebab casing for scripts (e.g., `wait-graph.ts`) and PascalCase for classes. Exported functions should be verbs (`detectDeadlocks`, `renderReport`). Rely on the configured ESLint + Prettier combo; never hand-edit the generated formatting.

## Testing Guidelines
Unit tests live beside their targets under `tests/` following `<module>.spec.ts`. Prefer Jest-style assertions via `@testing-library/jest-dom`. Add scenario tests under `tests/integration/` when verifying multi-service flows. Aim for ≥90% coverage on new modules; check with `npm run test:coverage`. Seed minimal, deterministic thread traces to keep flaky timing issues out of CI.

## Commit & Pull Request Guidelines
Structure commit messages using Conventional Commits (`feat:`, `fix:`, `chore:`) and limit subject lines to 72 characters. Squash WIP commits before opening a pull request. Each PR should link the relevant issue, summarize the change set, call out risk areas, and include before/after output snippets or screenshots if behavior changes. Request at least one review and ensure checks pass before merging.

## Security & Configuration Tips
Never commit live credentials; add new variables to `.env.example` with safe defaults. Review dependency updates with `npm audit` and note any high-risk advisories in the PR. When working on deadlock reproduction cases, sanitize customer data and redact process identifiers prior to sharing logs in the repository.

## Onboarding Notes
Refer to `docs/project-overview.md` for a living summary of the current architecture, feature surface, and pending ideas before starting new work. This document is kept up to date as the codebase evolves and should be your first stop for context.
