# Repository Guidance

## Architecture and boundaries

This repository is a pnpm monorepo for a Ukrainian Astro vCard site and lead-management API.

- `apps/web/` — `@vcard/web`, an Astro 5 static site with source, public assets, and Playwright tests.
- `apps/api/` — `@vcard/api`, a Hono API with SQLite persistence and Telegram/Email notification providers.
- `packages/shared/` — `@vcard/shared`, shared TypeScript types and Zod schemas.
- `ops/` — Docker Compose, proxy, Ansible, SSL, and deployment automation.
- `docs/`, `scripts/`, and `constants/` — project documentation and operational helpers.

Keep web composition in Astro, API/database ownership in `apps/api`, shared contracts in `packages/shared`, and deployment behavior in `ops/`. Preserve the API file contract for `apps/api/allowed_chats.json` and the existing Compose bind mount.

## Development commands

Use Node.js 24+ and pnpm 10.29.1. Install with `pnpm install --frozen-lockfile`.

```text
make dev                        Start the local Docker stack
pnpm dev:web                    Start Astro on port 4321
pnpm dev:api                    Start the API on port 5678
pnpm lint                       ESLint and package lint checks
pnpm format:check               Prettier check
pnpm stylelint                  CSS/Astro style check
pnpm mdlint                     Markdown check
pnpm typecheck                  TypeScript and Astro checks
pnpm build:all                  Build workspace packages
make secret-scan                Redacted current-tree Gitleaks scan
make scan                       Existing local container scan
```

## Conventions and testing

Use two-space indentation, LF endings, single quotes, no semicolons, and a 100-column Prettier width. ESLint, Stylelint, and Prettier are authoritative. Use `@/` for internal imports, workspace package names, and no `.js` extensions in source imports. Keep UI text Ukrainian and comments English.

Place API tests under `apps/api/src/tests/` and browser tests under `apps/web/e2e/`. Focus tests on changed behavior. The API integration suite creates a per-run SQLite database with `mkdtemp()` and cleans it up; it must keep using its explicit temporary path and mocked notification providers, never the checkout `data/leads.db` or external notification configuration. CI runs this suite without production secrets. Playwright CI installs Chromium with system dependencies and uses its built preview server: Chromium/a11y/SEO smoke runs on pull requests and pushes, while the full suite (including `perf`) runs nightly at 03:00 UTC and by manual dispatch.

## Deployment boundaries

The canonical production path is GitHub Actions → Ansible → the VPS project checkout → existing Docker Compose. `deploy.yml` and `rollback.yml` provide `TELEGRAM_ALLOWED_CHAT_IDS` from protected GitHub Secrets. Ansible requires a non-empty comma-separated list of numeric IDs in production, rewrites `apps/api/allowed_chats.json` on every canonical deploy, and writes it with mode `0600` and `no_log: true`.

The manual SSH and SSL workflows do not transport this secret. Before rebuilding through those paths, the VPS runtime must already contain the protected allowlist at `apps/api/allowed_chats.json`; do not create a second secret transport mechanism. Do not change the existing API bind mount, database volume, proxy, or health-check behavior without an approved plan.

## Secrets and private data

Never commit `.env` files, MCP credentials, Telegram IDs, private keys, certificates, SQLite lead databases, WAL/SHM files, or production configuration. Runtime data is ignored by `.gitignore`; local operational copies may remain outside Git.

The initial commit `f8d69cc13c9f9b15d70f35508faf7602ef40cad7` historically contained Hostinger and Context7 credentials, ACME/TLS/SSH private keys, and lead data. Treat this as historical exposure, not an accepted baseline. Rotate every exposed credential/key and separately decide whether history rewriting with `git filter-repo` or an equivalent tool is authorized. Do not perform either action as part of ordinary repository work.

## Codex workflow

Root `AGENTS.md` is the sole durable repository guidance source. Project configuration is in `.codex/config.toml`; the seven project roles are in `.codex/agents/`:

- `explorer` — read-only repository lookup
- `researcher` — read-only official documentation research
- `implementer` — focused workspace-write implementation
- `debugger` — read-only failure diagnosis
- `reviewer` — independent read-only correctness review
- `security-reviewer` — independent read-only security review
- `architect` — conditional read-only architecture review

The project allows at most three concurrent subagent threads. The implementer must not approve its own changes. Do not add project MCP servers or credentials; Context7 is an external documentation capability supplied through user/global configuration or the connected plugin.

## Context7, Graphify, and verification

Use Context7 only for official, version-sensitive documentation and keep its credentials outside Git. Graphify is installed by the official project command `graphify install --project --platform codex`; `.graphifyignore` excludes source-control metadata, build output, environments, databases, certificates, keys, runtime data, and discovery artifacts. Keep `graphify-out/` local and ignored. After code changes, use the installed Graphify workflow to update the local graph and inspect generated output for private paths before relying on it.

Before claiming completion, inspect the final diff and worktree, run the narrowest relevant tests, then run applicable lint, format, style, Markdown, typecheck, build, and `git diff --check` commands. Run `make secret-scan` for current-tree findings and a separate redacted full-history audit; historical findings require manual security action and must not be baselined. Report every requested check as `PASS`, `BLOCKED`, `FAIL`, or `NOT VERIFIED`.

## Commits and pull requests

Use imperative, lowercase English commit subjects in the form `type(scope): short description`, without a trailing period and targeting 72 characters. Common types are `feat`, `fix`, `refactor`, `docs`, `chore`, and `ci`. Do not commit or push unless explicitly requested. Pull requests must describe the change and validation, link issues when applicable, include visual evidence for UI changes, and pass CI before review.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip Graphify. Only skip Graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
