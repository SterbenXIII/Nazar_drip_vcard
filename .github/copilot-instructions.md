# Copilot Instructions — astro-vcard

> Source of truth: `AGENTS.md` (root). Follow it; this file summarizes essentials for AI agents.

## Architecture & Domain

- pnpm monorepo with three workspaces: `@vcard/web` (Astro 5 SSG, `apps/web`), `@vcard/api` (Hono + SQLite, `apps/api`), `@vcard/shared` (Zod schemas/types, `packages/shared`). All UI text is Ukrainian; comments/commits in English.
- TypeScript uses `moduleResolution: bundler`; **never switch to NodeNext and never add `.js` extensions**. Internal imports use `@/…`; cross-package imports use the workspace name (e.g., `@vcard/shared`). No relative `../..`.

## Key Patterns

- API: Strategy via `NotificationFactory`; providers extend `BaseNotificationProvider`; coordinator `NotificationCoordinator` orchestrates save + notify. Barrel exports everywhere. New env vars go to `apps/api/src/config/env.config.ts` (Zod). New schemas live in `@vcard/shared`, not in API.
- Web: Pure `.astro`, zero client JS unless requested; content comes from `apps/web/src/data/content.json`; icons via `astro-icon`; styles scoped, use CSS vars `var(--background|--text|--accent)`, respect `prefers-color-scheme: dark`. Update CSP/JSON-LD in `layouts/Layout.astro` when adding external resources/content.
- Lead typing: `services: string[]` end-to-end; form reads checkboxes with `FormData.getAll('services')`; schema in `packages/shared/src/schemas/lead/lead.schema.ts`.

## Builds & Commands

- Per package: `tsc -b && tsc-alias -p tsconfig.json -f`. Full pipeline: `pnpm build:all` (shared → api → web).
- Dev: `pnpm dev:api` (port 5678), `pnpm dev:web` (port 4321).
- Docker: use `docker compose` (no hyphen). Helper make targets: `make dev` (local stack with mkcert SSL), `make up` (prod stack), `make rebuild`, `make logs`, `make cert-local`.
- Cleanup: `pnpm clean` (everything) or `pnpm nuclear-clear` (dist + .tsbuildinfo).

## Dockerfiles / Compose

- Compose builds from root context `.` for web and api; network `web-gateway`; API volume `api_data:/app/data`; mounts `apps/api/allowed_chats.json` read-only.
- Web Dockerfile builds shared then web, serves via nginx with `docker/nginx/default.conf` (accepts IP `76.13.79.71`; `proxy_pass http://vcard-api:5678` preserves paths).
- API Dockerfile builds shared then api, uses `pnpm deploy` to flatten node_modules; runtime copies dist + flat deps; exposes 5678.

## Deployment (current target: IP only)

- Deploy path: `/home/emerald-recovery`; VPS IP: `76.13.79.71` (domain may not resolve yet). Deployment via `.github/workflows/deploy.yml` → Ansible playbook `ansible/playbook.yml` (ensures `web-gateway`, clones repo to deploy path, renders `.env`, runs `docker compose up -d --build`).
- Required secrets in GitHub Actions: `HOSTINGER_SSH_KEY`, `HOSTINGER_SSH_USER`, `HOSTINGER_VPS_HOST` or IP, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MASTER_ID`, `SMTP_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `ADMIN_EMAIL`, `N8N_ENCRYPTION_KEY`, `POSTGRES_PASSWORD` (optional `DEPLOY_PATH`).
- Post-deploy smoke: http://76.13.79.71 and http://76.13.79.71/api/health.

## Commit Convention (commitlint enforced)

- Format: `type(scope): description` (lowercase, imperative, ≤72 chars, no trailing period). Types: feat/fix/style/refactor/docs/chore/perf. Scope must be one of: web, api, shared, config, docker, ci, deps, content, layout, ui, seo, csp.

## MCP servers (see `.vscode/mcp.json`)

- `sequentialthinking` (Docker) for multi-step reasoning; `context7` (Docker) for library docs; `memory` (npx) to persist decisions. Use `resolve-library-id` → `get-library-docs` for docs; use `create_entities`/`add_observations` to store project facts.

## Style & Coding

- Package manager: pnpm 10.29.1. Single quotes in TS; async/await; `catch (err: unknown)` with narrowing; prefer `type` aliases for simple shapes; string enums.
