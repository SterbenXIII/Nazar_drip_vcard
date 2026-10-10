# HAVENHUB B0 Lead Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal HAVENHUB lead form that safely accepts name, phone, dependency type and delivers it to an authorized Telegram bot chat.

**Architecture:** Dedicated clinic contract and server route avoid forcing fake `district` or `services` into the legacy schema. The server validates, durably accepts, and records delivery status; a bounded worker sends to Telegram. The frontend activates only after runtime configuration and privacy gates are satisfied.

**Tech Stack:** Astro 7.3.1, TypeScript, Hono, Zod, SQLite, existing Telegram provider, Playwright/Vitest.

**Spec:** `docs/havenhub-kit/06-b0-lead-spec.md`; also read `docs/superpowers/specs/2026-10-07-havenhub-landing-seo-design.md`.

## Global Constraints

- Before code, inspect the current checkout's API router, SQLite migrations, coordinator, shared schema and `docs/new-clinic/06-lead-flow-decision.md` if present; this plan's paths are based on public `ref/migrate` on 2026-10-08.
- Do not change `apps/web` lead behavior or its `leadSchema` required `district/services`; add clinic-owned contract instead.
- No bot token/chat ID in client code, generated HTML, Git, tests or logs. No real Telegram sends or real phone numbers in tests.
- The public form remains disabled until server contract, privacy copy, delivery checks and release gate are approved.
- No commit/push/deploy without explicit user instruction. API changes are a separate reviewed scope from the frontend landing plan.

## Review Focus

1. Duplicate browser retry after timeout must not send duplicate Telegram messages: Task 3.
2. Telegram failure after durable acceptance must not falsely tell user delivery succeeded: Task 3.
3. Missing bot configuration must keep form unavailable: Task 4.
4. Legacy `apps/web` payload must remain compatible: Task 1 and Task 5.
5. Personal data must not leak through logs, API response or Playwright artifacts: Task 2 and Task 5.

## File Map

| Concern | Candidate files; confirm exact paths at checkout |
| --- | --- |
| Dedicated contract | `packages/shared/src/schemas/lead/clinic-lead.schema.ts` (new), shared export index, contract tests |
| Route and persistence | `apps/api/src/routes/clinic-lead.routes.ts` (new), API router registration, new SQLite migration/repository, focused integration tests |
| Delivery | Existing Telegram provider interface plus clinic-specific notification job/retry, fake provider tests |
| UI | `apps/clinic-web/src/components/Contact.astro`, `src/scripts/clinic-lead-form.ts`, `e2e/lead-form.spec.ts` |
| Operations | Protected env configuration in existing ops contract, `docs/new-clinic/lead-flow-runbook.md` (new), no values committed |

---

### Task 1: Freeze existing behavior and choose exact B0 contract

**Interfaces:** `ClinicLeadInput = {name: string, phone: string, dependencyType: 'alcohol' | 'drugs' | 'gambling', source: 'clinic-web', challengeToken?: string}` as proposed internal IDs; public labels remain Ukrainian. The current `LeadPayload` for `apps/web` remains untouched.

- [ ] Read actual API route/migration/provider files and confirm same-origin endpoint plus persistence model; record any contract change in the B0 spec before implementation.
- [ ] Add failing schema tests for all three enums, invalid phone/name, unknown type, and existing `leadSchema` accepting its old fixture. Run focused Vitest; expect only new contract cases FAIL.
- [ ] Implement `clinicLeadSchema` and exports, then rerun focused schema and old integration tests; expected PASS.

### Task 2: Server validation and durable acceptance

**Interfaces:** `POST /api/clinic/leads` is proposed; exact router path must be settled from Task 1. Request has clinic schema and a per-request idempotency key. Response `202 {accepted: true, id: opaqueId}` only after lead and pending delivery record are stored; validation error does not write.

- [ ] Write integration tests using per-run temp SQLite for valid input, unknown field/type, missing/invalid challenge where configured, missing idempotency key, redacted response/logs, and persistence failure.
- [ ] Implement route, repository and migration with atomic lead + outbox insertion; preserve existing API bind mount/volume behavior.
- [ ] Run focused integration suite; expected: one persisted synthetic lead and one pending job on success, zero writes otherwise. No external network.

### Task 3: Telegram delivery, retry and idempotency

**Interfaces:** Worker consumes pending job by ID, sends minimal fields to a configured chat, marks delivered only after provider success; retry bounded with backoff, terminal failure observable to operators. Repeated request key returns same accepted ID and produces no second job.

- [ ] Write fake-provider tests for success, transient failure, exhausted retry, simultaneous worker claim, duplicate POST, restart resume, and no PII/token in logs.
- [ ] Implement worker using existing Telegram provider where compatible; do not silently treat a provider failure as delivered. Define retry bounds in configuration and runbook.
- [ ] Run focused tests twice with random order; expected one logical delivery per accepted idempotency key and correct pending/failed states.

### Task 4: Three-field frontend and guarded activation

**Interfaces:** Visible inputs map to `name`, `phone`, `dependencyType`; a runtime/build gate only enables submit when server and privacy prerequisites are present. Success copy says «Звернення отримано. Ми зв'яжемося з вами». Telephone and Telegram remain usable.

- [ ] Add failing Playwright tests for keyboard labels/focus, empty/invalid fields, one POST while pending, retry/error, absent Turnstile token handling, and disabled state when B0 gate is missing. Mock HTTP responses and synthetic phone.
- [ ] Adapt `Contact.astro` and `clinic-lead-form.ts` to clinic schema without fake district/services. Preserve B0-off no-POST behavior and the current normal publication guard.
- [ ] Run focused browser suite and a11y check; expected PASS, no real requests.

### Task 5: Privacy, deployment dry run and regression

**Files:** Runbook and exact env/proxy files established in Task 1.

- [ ] Document consent copy, purpose, authorized chat access, retention/deletion procedure, alert for terminal failures, rotation and rollback, with owner approval fields. No secret values.
- [ ] Run shared/API/clinic tests, frozen install, lint/type/build, Docker smoke, secret scan and diff review. Confirm old `apps/web` lead integration tests still pass.
- [ ] In a protected test environment, use synthetic data and test chat to verify accepted → delivered/pending behavior; if test chat/config absent, report BLOCKED, keep UI disabled. Never send a real client application as a smoke test.
- [ ] Integrate into public UI only after documented privacy and production approval; otherwise ship landing with direct contacts and a recorded B0 blocker.

## Self-review and handoff

The plan covers contract mismatch, validation, persistence, delivery, UI, privacy, failure/retry, observability and release. The exact route and storage files are a checkpoint, not a license to invent a parallel API. If the checkout already offers an equivalent durable notification mechanism, adapt this plan before coding and preserve existing behavior. Report each test PASS/FAIL/BLOCKED/NOT VERIFIED; attach no PII.
