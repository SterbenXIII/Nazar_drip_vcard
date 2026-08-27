# Repository Guidelines

## Project Structure

This is a pnpm monorepo for an Astro vCard site and lead-management API.

- `apps/web/` — `@vcard/web`, an Astro 5 static site. Source, public assets, and Playwright tests live under `src/`, `public/`, and `e2e/`.
- `apps/api/` — `@vcard/api`, a Hono API with SQLite, notification providers, and Vitest integration tests.
- `packages/shared/` — `@vcard/shared`, shared TypeScript types and Zod schemas.
- `ops/` — Docker Compose, Nginx/Caddy, Ansible, and deployment scripts.
- `docs/`, `scripts/`, and `constants/` — documentation and operational helpers.

## Build, Test, and Development Commands

Use Node.js 24+ and pnpm 10.29.1. Run `pnpm install --frozen-lockfile` after checkout.

- `make dev` — start the local Docker stack (Docker required).
- `pnpm dev:web` / `pnpm dev:api` — run Astro on port 4321 or the API on port 5678.
- `pnpm build:all` — build all workspace packages.
- `pnpm lint`, `pnpm format:check`, `pnpm stylelint`, and `pnpm mdlint` — run repository quality checks.
- `pnpm typecheck` — run TypeScript checks.
- `pnpm --filter @vcard/api test` — run API Vitest tests.
- `pnpm --filter @vcard/web test:e2e` — run web Playwright tests.

## Coding Style and Naming

Use two-space indentation, LF endings, single quotes, no semicolons, and Prettier’s 100-column width. ESLint, Stylelint, and Prettier are the source of truth. Use `@/` for internal imports, workspace names across packages, and no `.js` extensions in source imports. Keep UI text Ukrainian and comments English. Keep web changes in Astro without client JavaScript unless required.

## Testing Guidelines

Place API tests under `apps/api/src/tests/` and browser tests under `apps/web/e2e/`. Name tests for the behavior covered, such as `lead-submission.test.ts` or `a11y.spec.ts`. No repository-wide coverage threshold is configured; add focused tests for behavior changes.

## Commits and Pull Requests

Use imperative, lowercase English commit subjects in the form `type(scope): short description`, with no trailing period and a 72-character target. Common types include `feat`, `fix`, `refactor`, `docs`, `chore`, and `ci`. PRs should describe the change and validation, link issues when applicable, include visual evidence for UI changes, and pass CI before review.

## Security and Configuration

Copy `.env.example` to `.env`; never commit secrets, private keys, production configuration, or SQLite databases containing lead data. Use `docker compose`, not legacy `docker-compose`.
