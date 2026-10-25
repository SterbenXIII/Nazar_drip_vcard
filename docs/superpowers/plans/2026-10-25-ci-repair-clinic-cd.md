# CI Repair and Clinic Staging CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Обраний спосіб виконання — **Native**: один implementer виконує задачі послідовно, незалежний reviewer перевіряє готовий diff.

**Goal:** Відновити перевірки API та clinic-web, забезпечити узгоджений і відтворюваний CD та виконати перший успішний staging-деплой на `havenhub.tech` і `www.havenhub.tech`.

**Architecture:** Один workflow `CI` перевіряє компоненти активного деплою. Після успішного CI на `main` CD збирає й перевіряє runtime-образи, публікує їх у GHCR та передає Ansible точний SHA і digest кожного образу. Ansible розгортає відповідний checkout через існуючі Docker Compose і Caddy. `apps/web` перевіряється окремим legacy workflow.

**Tech Stack:** Node.js 24.20.0, pnpm 10.29.1, Astro, Hono, SQLite, Playwright, GitHub Actions, GHCR, Python 3.12 для controller, ansible-core 2.21.5, Ubuntu 26.04 VPS, Docker Compose, Caddy 2.

**Spec:** [`docs/superpowers/specs/2026-10-25-ci-repair-clinic-cd.md`](../specs/2026-10-25-ci-repair-clinic-cd.md). Прочитати разом із цим планом перед виконанням.

## Global Constraints

- На VPS працюють лише `apps/api`, `apps/clinic-web` і Caddy; сповіщення — через Telegram.
- `apps/web`, n8n і PostgreSQL не входять у цей deployment.
- GitHub Environment зберігає назву `production`; clinic залишається у режимі `staging`.
- HTTPS і Basic Auth обов’язкові для обох доменів. Логін — `stage`.
- Зберегти `noindex,nofollow`; staging приймає заявки за Basic Auth і передає їх у Telegram.
- Зберегти SQLite named volume, існуючий bind mount `allowed_chats.json` і права файла `0600`.
- Не змінювати lead schema, правила вибору Telegram-одержувачів або обробку webhook у межах цього плану.
- Секрети не потрапляють у Git, Docker-образи, release artifacts або відкриті логи.
- Зберегти оригінальні зображення користувача та локальні QA-артефакти.
- Планування не запускає push, deploy, зміну DNS або інших зовнішніх налаштувань.
- Після кожної задачі перевірити diff і не торкатися чужих або generated-файлів. Комітити лише після окремого явного запиту користувача.

## Review Focus

1. CI успішний, але потрібна перевірка пропущена — CD має залишитися заблокованим.
2. Завершився старий CI або main змінився під час очікування — образи й checkout не повинні змішувати різні релізи.
3. Відсутній чи пошкоджений audit-звіт або прострочений виняток — security gate має завершитися помилкою.
4. Чистий VPS без Docker або root-owned allowlist — bootstrap і доступ API мають перевірятися фактичним запуском.
5. Невдалий deploy чи несумісна SQLite schema — дані зберігаються, автоматичний небезпечний rollback не виконується.

---

## Карта файлів і відповідальностей

| Одиниця                 | Файли                                                                                                                                                                                                           | Відповідальність                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Clinic assets та образи | `apps/clinic-web/src/components/Services.astro`, `apps/clinic-web/src/assets/care-formats/*.png`, `.dockerignore`, `apps/clinic-web/Dockerfile`, `ops/docker/api/Dockerfile`                                    | Чистий build та працездатні runtime images                |
| Audit gate              | `scripts/ci/audit-release.mjs`, `scripts/ci/audit-release.test.mjs`, `scripts/ci/audit-exceptions.json`, активні package manifests, `pnpm-lock.yaml`                                                            | Fail-closed перевірка активних залежностей                |
| CI                      | `.github/workflows/ci.yml`, `.github/workflows/clinic-web-ci.yml`, `.github/workflows/legacy-web-ci.yml`, `tests/test_clinic_ci_contract.sh`                                                                    | Один блокувальний release gate; окремий legacy CI         |
| CD та release manifest  | `.github/workflows/deploy.yml`, `ops/ansible/playbook.yml`, `ops/ansible/tasks/03_project.yml`, `ops/ansible/tasks/05_deployment.yml`, Compose файли, `tests/test_clinic_vps_deployment_contract.sh`            | Одна версія source, digest images та перевірений manifest |
| VPS bootstrap           | `ops/ansible/tasks/01_preflight_system.yml`, `ops/ansible/tasks/03_project.yml`, `ops/ansible/tasks/06_permissions.yml`, `scripts/ci/check_stage_dns.py`, його unit-тест                                        | Початковий Docker, DNS, UID і volume                      |
| Backup та rollback      | `.github/workflows/rollback.yml`, `ops/ansible/playbook.yml`, `ops/ansible/tasks/backup_sqlite.yml`, `ops/ansible/tasks/05_deployment.yml`, `tests/test_phase2_deployment_contract.sh`                          | Snapshot перед mutation, перевірений manual rollback      |
| Runtime acceptance      | `ops/ansible/tasks/04_environment.yml`, `ops/ansible/tasks/08_healthcheck.yml`, `ops/docker/compose/docker-compose.proxy.yml`, `ops/scripts/monitor.sh`, `ops/scripts/daily_report.sh`, `ops/ansible/README.md` | Сервісні health checks, безпечні diagnostics та runbook   |

Спільні файли (`playbook.yml`, `03_project.yml`, `05_deployment.yml`) змінювати в задачах за вказаними контрактами, не створюючи паралельні реалізації одного deploy flow.

## Поточні підтверджені проблеми

- [CI для `ce9344b`](https://github.com/SterbenXIII/Nazar_drip_vcard/actions/runs/40122270264) падає на audit і встановленні Chromium: поточний Playwright не підтримує runner Ubuntu 26.04.
- Свіжий audit показав **76 знахідок, із них 22 High**.
- Основний CI перевіряє старий `apps/web`; clinic workflow прив’язаний до PR у `ref/migrate`.
- `Services.astro` імпортує три PNG з `design/`, яких немає у tracked `main` і Docker build context.
- VPS checkout береться з поточного `main`, хоча образи мають SHA завершеного CI.
- Перший deploy вимагає Docker ще до задачі Ansible, яка має його встановити.
- Allowlist записується від імені SSH-користувача з `0600`, а API працює як `node`.
- Ansible копіює старі root-level monitoring scripts замість `ops/scripts/`.
- Поточні deployment contract-тести та три E2E inventory-тести проходять, але не виявляють перелічені runtime-проблеми.
- Redacted full-history Gitleaks scan на поточній історії знаходить 4 історичні findings; їхня ротація/відкликання є окремим live gate у Task 9, без переписування історії цим планом.

## Task 1: Відтворювана clinic-збірка з чистого checkout

**Files:** Modify `apps/clinic-web/src/components/Services.astro`, `apps/clinic-web/Dockerfile`, `ops/docker/api/Dockerfile`, `.dockerignore`; create three PNG files in `apps/clinic-web/src/assets/care-formats/`; test `apps/clinic-web/e2e/homepage.spec.ts` and `tests/test_clinic_vps_deployment_contract.sh`.

**Interfaces:** результат — clinic staging і API runtime images, які збираються без локального `design/`, `.env`, бази або build output.

- [x] Додати до `homepage.spec.ts` перевірку, що всі три care-format `<img>` завантажуються з `naturalWidth > 0`; до contract-тесту — що імпорти не виходять за Docker build context і файли відстежуються Git.
- [x] Запустити вузькі тести на вихідній гілці: contract-тест має впасти через untracked `design/` imports; browser assertion запускається після успішного build.
- [x] Скопіювати три надані оригінали у tracked assets: `consultation.png`, `residential.png`, `home-visit.png`. Оновити імпорти, зберегти alt-тексти й відображення карток.
- [x] Зафіксувати Node 24.20.0 у CI та Docker builder stages. Базові образи закріпити digest перевірених образів; прибрати застарілий OCI source URL іншого репозиторію.
- [x] Перевірити в чистому checkout:
  ```bash
  pnpm install --frozen-lockfile
  pnpm --filter @vcard/shared build
  pnpm --filter @vcard/clinic-web check
  pnpm --filter @vcard/clinic-web build:staging
  ```
  Очікування: відсутні unresolved imports; створені оптимізовані зображення.
- [x] Зібрати обидва runtime-образи без локальних кешованих залежностей. У фінальному API image перевірити завантаження `better-sqlite3` та відкриття `:memory:` з `/app/apps/api`.
- [x] Перевірити clinic image: `/` повертає `200`, відсутній маршрут — `404`, усі три зображення доступні, staging metadata забороняють індексацію.
- [x] Повторити contract і browser тести; `PASS` означає відсутність імпортів з `design/`, три завантажені зображення та чистий build без локальних файлів.

## Task 2: Security gate для активного deployment

**Files:** Modify `apps/api/package.json`, `apps/clinic-web/package.json`, `packages/shared/package.json`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` only as dependency resolution requires; create `scripts/ci/audit-release.mjs`, `scripts/ci/audit-release.test.mjs`, `scripts/ci/audit-exceptions.json`.

**Interfaces:** pure function `evaluateAudit(stdout, exceptions, today) -> { exitCode, activeFindings, legacyFindings, acceptedExceptions }`; CLI captures `pnpm audit --json` stdout, including its valid report when pnpm exits nonzero for findings. It returns `0` for an allowed report, `1` for blocking findings and `2` for invalid output or registry failure.

- [x] Зберегти redacted fixture реального `pnpm audit --json` формату у `scripts/ci/fixtures/`; написати `node --test scripts/ci/audit-release.test.mjs` з кейсами: active High/Critical → `1`, legacy-only High → `0` з окремим повідомленням, змішані paths → `1`, unknown importer/невалідний JSON/registry error → `2`, exact exception → `0`, інша версія/expiry → `1`.
- [x] Запустити тести до створення CLI; очікування: `FAIL` через відсутній `audit-release.mjs`.
- [x] Реалізувати `node scripts/ci/audit-release.mjs`: виклик `pnpm audit --json`, перевірка коду виходу й повноти звіту, класифікація за фактичними importer paths із fixture. Активні root tooling, `apps/api`, `apps/clinic-web`, `packages/shared`; legacy-only `apps/web` звітувати окремо. Unknown importer/format не вважати успіхом.
- [x] Оновити прямі залежності: Astro до `7.3.3`, Nodemailer до `10.1.4`, Vitest до `4.1.12`, Zod API/shared до `4.6.6`. Узгодити типи Nodemailer з результатом typecheck.
- [x] Оновити активні транзитивні залежності до перевірених виправлених версій: `devalue 5.9.3`, `sharp 0.35.5`, `vite 8.2.4`, `undici 8.12.2`, `source-map-js 1.2.2`, `markdown-it 15.0.3`, `brace-expansion 1.1.21` і `5.0.12` для відповідних major-гілок. Використовувати overrides лише там, де оновлення батьківського пакета недостатнє; не підміняти legacy Zod 3 на Zod 4.
- [x] Для `GHSA-ch52-4w7c-c8xp` дозволити один виняток лише для `http-cache-semantics@4.2.0` через clinic Astro, **якщо перевірка підтвердить**, що залежність відсутня в runtime image та використовується лише для build-time image cache. JSON-запис містить advisory ID, package, version, importer path, доказ, причину і `expires: 2026-11-24`; інші advisory/version/path і дата після expiry блокуються.
- [x] Запустити `node --test scripts/ci/audit-release.test.mjs`, `pnpm install --frozen-lockfile`, `pnpm --filter @vcard/api test`, `pnpm --filter @vcard/clinic-web check` і live audit CLI. Очікування: тести проходять, CLI створює redacted звіт через `AUDIT_REPORT_PATH`; CI artifact upload виконується у Task 3, інші активні High/Critical залишаються blocking.

Для зазначеного advisory наразі [немає patched version upstream](https://github.com/advisories/GHSA-ch52-4w7c-c8xp). Виняток не поширюється на інші advisory чи майбутні версії пакета.

## Task 3: Єдиний authoritative CI

**Files:** Modify `.github/workflows/ci.yml`, `.github/workflows/clinic-web-ci.yml`; create `.github/workflows/legacy-web-ci.yml`, `tests/test_clinic_ci_contract.sh`; update `tests/test_clinic_vps_deployment_contract.sh` only where the workflow contract changes.

**Interfaces:** workflow `CI` є єдиним upstream для CD. Він повністю перевіряє API, clinic і deployment contract без production secrets.

- [x] Створити contract-тест `tests/test_clinic_ci_contract.sh`: `CI` містить усі required jobs, `release-ready` залежить від кожної та вважає `skipped` помилкою; `apps/web`/n8n відсутні в blocking jobs; `workflow_run` у CD слухає лише `CI`. Запустити: очікування `FAIL` на поточному `ci.yml`.
- [x] Перенести `apps/web` build/typecheck/E2E/Lighthouse та legacy-перевірки в `.github/workflows/legacy-web-ci.yml`. Він запускається для релевантних змін, але його conclusion не є умовою цього CD.
- [x] У головному CI встановити `ubuntu-24.04`, Node 24.20.0, pnpm 10.29.1 і `permissions: contents: read`. Browser job встановлює Chromium із версії Playwright workspace.
- [x] Зробити обов’язковими jobs з IDs `secret-scan`, `active-checks`, `api-tests`, `clinic-acceptance`, `clinic-publication`, `runtime-images`, `ops-contract`; `active-checks` викликає Task 2 audit CLI. Docker lint/build/smoke охоплює лише API та clinic, а API tests використовують ізольовану тимчасову БД і mocked providers.
- [x] Publication matrix запускати послідовно відносно тестів, що використовують той самий `dist/`. Зберігати Playwright diagnostics при помилках. Виявлені acceptance-регресії виправляти без пропуску тестів або довільного послаблення assertions.
- [x] Додати фінальний job `release-ready` з `needs` на всі сім required jobs і `if: always()`; явна умова перевіряє `result == 'success'` для кожного, тому `skipped`, `cancelled` і `failure` завершуються помилкою.
- [x] Перевірити event matrix: PR у main виконує CI без deploy; main push і manual CI можуть стати release candidate; schedule виконує перевірки, але не запускає CD. Головний CI не повинен зникати через `paths` filters.
- [x] Запустити `bash tests/test_clinic_ci_contract.sh`, `actionlint .github/workflows/ci.yml .github/workflows/legacy-web-ci.yml .github/workflows/clinic-web-ci.yml`; очікування `PASS`. Окремо звірити всі job IDs із `needs` і trigger matrix у diff.

Не використовувати root-команди, які непомітно знову включають legacy `apps/web` у blocking checks. Існуючий `tests/run.sh` містить сторонні deployment-перевірки; у цьому CI викликати конкретні clinic/phase2 тести.

## Task 4: Узгоджений release від CI до VPS

**Files:** Modify `.github/workflows/deploy.yml`, both runtime Dockerfiles, `ops/docker/compose/docker-compose.yml`, `ops/ansible/playbook.yml`, `ops/ansible/tasks/03_project.yml`, `ops/ansible/tasks/05_deployment.yml`, `tests/test_clinic_vps_deployment_contract.sh`.

**Interfaces:**

- `release_sha`: повний lowercase SHA коміту.
- `api_image_ref`, `clinic_web_image_ref`: GHCR references із `@sha256:…`.
- `release.json`: `{release_sha, api_image_ref, clinic_web_image_ref, ci_run_id, deploy_run_id}`; запис після успішного smoke до `{{ project_dir }}/releases/{{ release_sha }}.json` і upload як Actions artifact, без секретів.

- [ ] Додати contract assertions: `head_repository.id == repository.id`, `head_branch == main`, повний SHA checkout, digest references у Compose/Ansible, відсутність `version: main` і token-bearing Git URL. Запустити contract-тест: очікування `FAIL` на поточному deploy flow.
- [ ] Приймати `workflow_run` лише після успішного `CI`, для trusted repository і `main`, події `push` або `workflow_dispatch`. Checkout на runner — саме `workflow_run.head_sha`; перевірити, що це commit поточного `main` до VPS mutation.
- [ ] Один раз зібрати candidate API та clinic images для фактичної архітектури VPS, завантажити їх у локальний Docker runner, провести smoke із синтетичним allowlist і без зовнішніх Telegram/Email. Після `PASS` публікувати ці самі локальні image IDs із тегами повного SHA; отримати registry digests. Додати OCI labels source/revision.
- [ ] Build/publish job отримує `packages: write`; VPS deploy job — `contents: read`, `packages: read`. Права для читання Actions artifacts додавати лише jobs, які їх використовують.
- [ ] Безпосередньо перед VPS mutation повторно порівняти candidate з remote `main`. Якщо SHA змінився, пропустити deploy/notification, записати `superseded` у job summary та завершити без mutation; активний deploy не переривати.
- [ ] Передати `release_sha`, `api_image_ref`, `clinic_web_image_ref` в Ansible. І початковий clone, і наступні update виконують detached checkout цього SHA; прибрати `version: main`. Compose приймає `API_IMAGE_REF` і `CLINIC_WEB_IMAGE_REF` як digest overrides, зберігаючи tag fallback для локального використання.
- [ ] Git checkout публічного репозиторію використовує URL без токена. GHCR credentials зберігати у тимчасовому Docker config із `0700`, прибирати після роботи.
- [ ] Після успішних smoke checks перевірити `git rev-parse HEAD`, OCI revision і фактичні image digests обох контейнерів. Лише після збігу атомарно записати VPS `release.json` і завантажити Actions artifact; відсутній/частковий manifest означає failed release, навіть якщо сервіси вже працюють.
- [ ] Запустити `bash tests/test_clinic_vps_deployment_contract.sh`, `docker compose -f ops/docker/compose/docker-compose.yml config` із dummy digest refs та `actionlint .github/workflows/deploy.yml`; очікування `PASS` і image values з `@sha256:`.

Зберегти спільну concurrency group для deploy/rollback і `cancel-in-progress: false`. Не покладатися на FIFO: GitHub [не гарантує порядок concurrency runs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency).

## Task 5: Перший запуск на Ubuntu 26.04

**Files:** Modify `ops/ansible/tasks/01_preflight_system.yml`, `ops/ansible/tasks/03_project.yml`, `ops/ansible/tasks/06_permissions.yml`, `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`; create `scripts/ci/check_stage_dns.py`, `scripts/ci/test_check_stage_dns.py`.

**Interfaces:** bootstrap підтримує поточний SSH-доступ `root`; runtime API зберігає користувача `node`, його UID/GID перевіряються у зібраному образі.

- [ ] Написати `test_check_stage_dns.py`: A кожного host дорівнює `72.61.138.53` → `PASS`; чужа A, чужа AAAA, недоступний DNS або AAAA за відсутності VPS IPv6 → `FAIL`. Запустити до реалізації: очікування `FAIL` через відсутній helper.
- [ ] Реалізувати `check_stage_dns.py` на Python stdlib (`socket`, `ipaddress`): CLI приймає обидва hostnames, `VPS_IP` і список глобальних IPv6, прочитаний по SSH з `ip -6` на VPS; кожну A/AAAA нормалізувати й порівняти. Викликати до першої VPS mutation, не змінювати DNS.
- [ ] В обох workflows використати Python 3.12 і `ansible-core==2.21.5`, зберегти pinned collections. Прибрати зайві callbacks, якщо їх немає у встановлених колекціях, та невикористану інсталяцію Python Docker SDK через system pip.
- [ ] Workflow preflight перевіряє SSH і ресурси, але не вимагає вже встановленого Docker. Встановлення, запуск Docker та перевірки `docker info`/`docker compose version` належать Ansible.
- [ ] Використати одну привілейовану identity для Docker login, pull, compose, перевірок і cleanup. Для поточного root-доступу не створювати нового користувача або другого SSH-key flow.
- [ ] Після Ansible bootstrap перевірити `docker info` і `docker compose version`, а також архітектуру VPS проти candidate images; очікування: обидві команди працюють з обраною root identity.
- [ ] Записувати allowlist із числовим власником runtime UID/GID API та `0600`, зберігши наявний bind mount. Після запуску від імені API перевірити читання файла, валідний JSON і очікувану кількість ID без їхнього друку.
- [ ] Замість permission-перевірок неактивного host DB path перевіряти доступ API до `/app/data` у named volume. Не перейменовувати Compose project або наявний volume.
- [ ] Запустити `python3 -m unittest discover -s scripts/ci -p 'test_check_stage_dns.py'`, Ansible syntax-check і lab smoke з root-owned `0600` allowlist; очікування: тести проходять, API читає allowlist від runtime UID, створює SQLite у named volume.

Обрана Ansible-база підтримує Python 3.14 target, який постачається з Ubuntu 26.04; поточний Ansible 11 цього не забезпечує. Джерело: [Ansible support matrix](https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html).

## Task 6: Збереження SQLite та ручний rollback

**Files:** Modify `.github/workflows/rollback.yml`, `ops/ansible/playbook.yml`, `ops/ansible/tasks/05_deployment.yml`, `tests/test_phase2_deployment_contract.sh`, `ops/ansible/README.md`; create `ops/ansible/tasks/backup_sqlite.yml`.

**Interfaces:** rollback приймає лише SHA попереднього успішного релізу з валідним `release.json`. `{{ project_dir }}/releases/reconciliation-required.json` блокує будь-яку наступну mutation до операторської звірки.

- [ ] Розширити `test_phase2_deployment_contract.sh` assertions: backup перед `compose up` і на update, і на rollback; rollback бере digest refs з manifest; чужий SHA/відсутній manifest блокує mutation. Запустити: очікування `FAIL` на чинному playbook.
- [ ] Винести backup в `tasks/backup_sqlite.yml` після Docker bootstrap, перед checkout/recreation. При наявній БД у named volume запускати старий перевірений API image з `--workdir /app/apps/api`, SQLite backup API і host bind `{{ backup_dir }}` (`0700` директорія, `0600` snapshot). Не покладатися на існування старого контейнера.
- [ ] На першому запуску без бази backup пропускається. Якщо дані або volume вже є, але попередній image/backup недоступний, mutation блокується. Snapshot має бути непорожнім і повертати `ok` для `PRAGMA integrity_check`; його шлях записати у безпечний операторський звіт без вмісту БД.
- [ ] Для rollback перевірити повний SHA, належність історії main, локальний manifest попереднього успішного deploy і відповідний успішний GitHub Actions run; звірити обидва доступні GHCR digests до recreation. Не приймати SHA поточного або неуспішного release.
- [ ] Checkout, Compose і images rollback використовують один release SHA. Найстаріша підтримувана точка — перший успішний реліз виправленого pipeline.
- [ ] Зберегти manual rollback. При помилці нового deploy workflow завершується failure, фіксує попередній успішний SHA і шлях snapshot; автоматично старий API не запускається через forward-only migrations.
- [ ] Безпосередньо перед recreation атомарно створити `{{ project_dir }}/releases/reconciliation-required.json` із candidate SHA/digests та попереднім успішним SHA, без секретів. Видалити лише після запису успішного manifest. Якщо marker лишився, наступний deploy/rollback блокується до операторської звірки running digests, checkout SHA, backup і schema; старий manifest не описує фактично запущені сервіси.
- [ ] У тестовому середовищі перевірити update + успішний rollback із сумісною schema та відмову до recreation при несумісності. Restore перевірити окремо на синтетичній БД з контрольним записом; ні snapshot, ні том не видаляти в цьому тесті.
- [ ] Заборонити видалення volumes і pruning із `--volumes`. Cleanup після успіху зберігає попередні релізи та snapshots.
- [ ] Запустити `bash tests/test_phase2_deployment_contract.sh` і Ansible syntax-check; очікування `PASS`. Lab evidence фіксує SHA, snapshot integrity і збереження контрольного запису, не дані користувача.

## Task 7: Health checks, diagnostics і monitoring

**Files:** Modify `ops/ansible/playbook.yml`, `ops/ansible/tasks/04_environment.yml`, `ops/ansible/tasks/08_healthcheck.yml`, `ops/docker/compose/docker-compose.proxy.yml`, `ops/scripts/monitor.sh`, `ops/scripts/daily_report.sh`, `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`; create `tests/test_clinic_monitoring.sh`.

**Interfaces:** `deploy success` означає перевірений доступ і runtime contract; саме `container running` недостатньо.

- [ ] Написати `tests/test_clinic_monitoring.sh` зі stub `docker`/`curl`: healthy три сервіси → success, один stopped/unhealthy або API health error → failure; daily report не каже «без інцидентів за 24 год» без історії. Запустити до правки: очікування `FAIL`.
- [ ] Виправити джерело monitoring scripts на `{{ playbook_dir }}/../scripts/{{ item }}`. Перевірити встановлені файли й cron paths; старі root-level скрипти не видаляти поза цією задачею.
- [ ] Monitor перевіряє running/health states і внутрішній API health. Daily report повідомляє поточний стан, не стверджує відсутність інцидентів за добу без відповідних даних.
- [ ] Перевіряти обидва HTTPS-домени: без credentials — `401`, із правильними — `200`, із неправильними — `401`; `/api/health` із credentials — `200`.
- [ ] Перевіряти HTTP redirect `308`, API validation `400` для порожньої HTTPS-заявки, staging robots metadata, відсутність зовнішнього доступу до API-порту.
- [ ] Використати однакову перевірену Caddy version/digest для password hashing і runtime. Plaintext staging password не записувати на VPS.
- [ ] Обмежити Actions diagnostics станами контейнерів, exit codes, release SHA і безпечними повідомленнями. Сирі application logs та секретні task results закрити `no_log`; не пересилати сирі logs у Telegram.
- [ ] Telegram success надсилати після всіх smoke checks. Помилка допоміжного сповіщення відображається окремо й не приховує результат deploy.
- [ ] Запустити `bash tests/test_clinic_monitoring.sh`, clinic/phase2 contract-тести, Ansible syntax-check і lab smoke; очікування `PASS` для health/auth/API-validation/metadata та жодного raw application log у failure artifact.

## Task 8: Локальна готовність і репетиція Ubuntu 26.04

**Files:** Create `tests/deployment/ubuntu2604_lab.sh` and `docs/superpowers/reports/clinic-cd-readiness.md`; modify `.gitignore` to track only this report and `ops/ansible/README.md` for verified commands and recovery procedure.

**Interfaces:** produces one reviewed release candidate SHA and a `PASS`/`FAIL`/`BLOCKED`/`NOT VERIFIED` matrix. Task 9 consumes the SHA and evidence; no lab result is described as live proof.

- [ ] Перевірити diff: `actionlint`, Ansible syntax-check, Compose config, clinic/phase2 contracts, audit parser tests, API tests, clinic acceptance/publication, обидва runtime smoke tests, lint/format/typecheck та redacted current-tree scan.
- [ ] Провести окремий redacted history scan. Відомі історичні findings задокументувати як security action; не переписувати історію й не додавати baseline у цій задачі.
- [ ] Створити `tests/deployment/ubuntu2604_lab.sh` як відтворюваний сценарій для одноразової Ubuntu 26.04 VM: bootstrap без Docker, deploy, повторний deploy того самого SHA, оновлення, rollback і перевірки виходів. Використовувати синтетичні секрети/дані та лабораторний TLS.
- [ ] Запустити сценарій на одноразовій Ubuntu 26.04 VM; `PASS` вимагає фактичний bootstrap, idempotent повтор, update і rollback. Окремо подати stale CI SHA: жоден running image або checkout не змінюється. Якщо VM недоступна, позначити `BLOCKED`, не підміняти контейнером або syntax-check.
- [ ] Підтвердити читання allowlist від runtime UID, запис у той самий SQLite volume, збереження контрольних даних, backup integrity та відмову до recreation при недоступному image або backup. Окремо інʼєктувати збій після `compose up` до manifest і перевірити `reconciliation required` без автоматичного rollback.
- [ ] Провести незалежний code/security review готового diff. У readiness report записати конкретний SHA, кожен check із результатом, ризики, необхідні VPS-зміни та rollback boundary. Якщо потрібний check `FAIL`/`BLOCKED`, зупинитися до Task 9.

## Task 9: Перший live staging і доказ CD

**Files:** Update `docs/superpowers/reports/clinic-cd-readiness.md` and `ops/ansible/README.md` with observed run IDs, release SHA/digests and operational outcome. No application code is created in this task.

**Interfaces:** consumes Task 8 reviewed SHA; produces live `release.json` and public smoke evidence.

- [ ] До push звірити SSH host fingerprint із довіреним каналом, A/AAAA обох доменів із VPS, доступність 80/443, актуальність GitHub Environment secrets/vars і наявність тижневого backup. Підтвердити відкликання/ротацію історично відкритих ключів і credentials із `AGENTS.md`; якщо доказу немає, статус `BLOCKED`. Не друкувати значення secrets; кожен preflight має статус.
- [ ] Після окремо дозволеного merge/push у `main` простежити один ланцюжок `CI → GHCR → Ansible → smoke checks` за run IDs і точним SHA. Якщо CI падає або CD skip — виправити причину й повторити новим кандидатом; не запускати ручний обхід gate.
- [ ] Зовні перевірити довірений TLS, Basic Auth, API health, noindex/nofollow та безпечний invalid lead POST `400` для apex і www; API port `5678` не має приймати зовнішні з’єднання.
- [ ] Звірити VPS `release.json`, checkout HEAD, OCI revisions та running digests; перевірити операційне Telegram-сповіщення без тестової заявки.
- [ ] Оновити report/runbook фактичними доказами. Завершення — працюючий захищений staging і перевірений manual rollback у лабораторії; live rollback позначити `NOT VERIFIED`, доки немає попереднього live-релізу.

## Критерії завершення та припущення

- `CI` перевіряє саме активний deployment; legacy-only помилки не блокують його.
- PR, невдалий CI, пропущена required job і schedule не запускають VPS mutation.
- Реліз має узгоджені checkout SHA, OCI revisions і запущені image digests.
- Перший bootstrap, UID/allowlist, SQLite persistence, backup і rollback мають runtime-докази.
- `havenhub.tech` та `www.havenhub.tech` доступні через довірений HTTPS і Basic Auth; заявки залишаються заблокованими.
- Поточні GitHub secret names/scopes зберігаються. Нові release-параметри генерує workflow; ручних секретів для них не потрібно.
- Live VPS, фактичні secret values та належність поточного AAAA серверу під час цього аналізу не перевірялися. Кожна така перевірка має окремий результат `PASS`, `FAIL`, `BLOCKED` або `NOT VERIFIED`.
