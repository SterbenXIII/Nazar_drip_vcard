# AGENTS.md — astro-vcard monorepo

> Єдине джерело правди для всіх AI-агентів (Copilot, Codex, Cursor, Claude, тощо).
> Останнє оновлення: лютий 2026.

---

## 1. Архітектура проєкту

**Монорепо** на pnpm workspaces з трьома пакетами:

```text
astro-vcard/
├── apps/
│   ├── web/          ← @vcard/web   — Astro 5 фронтенд (статичний vCard сайт)
│   └── api/          ← @vcard/api   — Hono бекенд (заявки, сповіщення, Telegram бот)
├── packages/
│   └── shared/       ← @vcard/shared — Спільні zod-схеми та типи
├── docker/           ← Конфіги nginx, n8n
├── docker-compose*.yml ← Мульти-compose стек
├── Makefile          ← Оркестрація: dev, prod, SSL, backup
└── .env              ← Секрети (копіювати з .example.env)
```

### Пакети

| Пакет           | Опис                                           | Вхідна точка                     | Build                    |
| --------------- | ---------------------------------------------- | -------------------------------- | ------------------------ |
| `@vcard/web`    | Astro 5, статичний сайт, SSG                   | `apps/web/src/pages/index.astro` | `astro build`            |
| `@vcard/api`    | Hono HTTP-сервер, SQLite, Telegram/Email       | `apps/api/src/index.ts`          | `tsc -b && tsc-alias -f` |
| `@vcard/shared` | Zod-схеми (`leadSchema`), типи (`LeadPayload`) | `packages/shared/src/index.ts`   | `tsc -b && tsc-alias -f` |

### Залежності між пакетами

```text
@vcard/web ──depends──▸ @vcard/shared
@vcard/api ──depends──▸ @vcard/shared
```

---

## 2. TypeScript конфігурація

### Базовий tsconfig (`tsconfig.base.json`)

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler", // ← КРИТИЧНО: НЕ використовувати NodeNext
    "strict": true,
    "composite": true,
    "declaration": true,
  },
}
```

### Path aliases (`@/`)

Усі пакети використовують `@/*` → `./src/*` через `tsconfig.json`:

```jsonc
{
  "paths": {
    "@/*": ["./src/*"],
    "@vcard/shared": ["../../packages/shared/src/index.ts"],
  },
}
```

**Правила імпортів:**

```typescript
// ✅ ПРАВИЛЬНО — використовуй @/ для імпортів всередині пакету
import { TelegramProvider } from '@/services/providers/telegram.provider'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'

// ✅ ПРАВИЛЬНО — між пакетами через workspace ім'я
import { leadSchema } from '@vcard/shared'

// ❌ НЕПРАВИЛЬНО — не використовуй відносні шляхи
import { TelegramProvider } from '../../services/providers/telegram.provider'

// ❌ НЕПРАВИЛЬНО — не додавай .js розширення (moduleResolution: bundler)
import { X } from '@/services/index.js'
```

### tsc-alias

Після `tsc -b`, утиліта `tsc-alias` перезаписує `@/` аліаси на відносні шляхи з `.js` розширеннями в `dist/`:

```json
"build": "tsc -b && tsc-alias -p tsconfig.json -f"
```

> ⚠️ **НІКОЛИ** не змінюй `module` / `moduleResolution` на `NodeNext` в tsconfig пакетів — це зламає path aliases і потребуватиме `.js` розширень у кожному імпорті.

---

## 3. Структура `apps/api`

```text
apps/api/src/
├── index.ts                 ← Точка входу (Hono server)
├── app.ts                   ← Маршрути додатку
├── config/
│   └── env.config.ts        ← Zod-валідація змінних середовища
├── constants/
│   └── enums/               ← NotificationProvider, StorageType
├── core/
│   ├── abstracts/           ← BaseNotificationProvider, BaseStorageProvider
│   └── factories/           ← NotificationFactory (Strategy pattern)
├── interfaces/
│   ├── lead/                ← ILeadData
│   └── notification/        ← INotificationResult
├── middleware/
│   └── auth.ts              ← telegramAuth (whitelist через allowed_chats.json)
├── routes/
│   └── lead.routes.ts       ← POST /submit з zod-валідацією
├── services/
│   ├── coordinators/        ← NotificationCoordinator (оркестрація)
│   └── providers/           ← TelegramProvider, EmailProvider, SQLiteStorageProvider
├── types/
│   ├── lead/                ← LeadPayload
│   └── notification/        ← NotificationRegistry
└── utils/
    └── test-leads.ts        ← Тестовий скрипт
```

**Патерни:**

- **Strategy** — `NotificationFactory` вибирає провайдер (Telegram/Email) за enum
- **Abstract Base** — `BaseNotificationProvider`, `BaseStorageProvider`
- **Coordinator** — `NotificationCoordinator` оркеструє збереження + розсилку
- **Barrel exports** — кожна папка має `index.ts` з реекспортами

---

## 4. Структура `apps/web`

```text
apps/web/
├── astro.config.mjs         ← Вимагає DOMAIN_NAME з .env
├── public/
│   └── robots.txt
└── src/
    ├── assets/              ← Зображення, оброблені Astro
    ├── components/
    │   ├── ContactForm.astro
    │   ├── SEO.astro
    │   └── Welcome.astro
    ├── data/
    │   └── content.json     ← Єдине джерело контенту (Українська)
    ├── layouts/
    │   └── Layout.astro     ← HTML shell, JSON-LD, CSP, глобальні стилі
    └── pages/
        └── index.astro      ← Головна сторінка
```

**Конвенції контенту (`content.json`):**

```jsonc
{
  "name": "string", // Повне ім'я (Українська)
  "role": "string", // Посада / роль
  "bio": "string", // Короткий біографічний абзац
  "links": [
    // Зовнішні посилання
    { "platform": "string", "url": "string" },
  ],
  "projects": ["string"], // Назви проєктів
}
```

При розширенні:

1. Додай поле в `content.json`
2. Рендер у `src/pages/index.astro`
3. Оновити JSON-LD в `Layout.astro` якщо потрібно для SEO

---

## 5. Команди

### pnpm (основні)

| Команда              | Дія                                          |
| -------------------- | -------------------------------------------- |
| `pnpm install`       | Встановити залежності всього монорепо        |
| `pnpm build:all`     | Зібрати всі пакети (shared → api → web)      |
| `pnpm dev:api`       | api в watch mode (tsx, port 5678)            |
| `pnpm dev:web`       | web dev server (Astro, port 4321)            |
| `pnpm clean`         | Видалити dist/, node_modules, перевстановити |
| `pnpm nuclear-clear` | Видалити лише dist/ та .tsbuildinfo          |

### Make (Docker оркестрація)

| Команда             | Дія                                             |
| ------------------- | ----------------------------------------------- |
| `make help`         | Список всіх команд                              |
| `make init`         | Ініціалізувати структуру та Docker мережу       |
| `make dev`          | Локальний стек (watch + local SSL через mkcert) |
| `make up`           | Продакшн стек (SSL через certbot)               |
| `make down`         | Зупинити все                                    |
| `make rebuild`      | Повна перезбірка                                |
| `make logs`         | Логи (tail 50)                                  |
| `make cert-local`   | Локальні SSL (mkcert)                           |
| `make cert-init`    | Продакшн SSL (certbot)                          |
| `make backup-to-tg` | Бекап SQLite → Telegram                         |
| `make db-check`     | Останні 5 заявок з БД                           |
| `make clean-all`    | ПОВНЕ видалення (volumes, images, networks)     |

---

## 6. Docker архітектура

### Compose стеки

| Файл                       | Сервіси                                | Порти      |
| -------------------------- | -------------------------------------- | ---------- |
| `docker-compose.yml`       | `astro-vcard` (nginx), `backend` (API) | 8081, 5678 |
| `docker-compose.n8n.yml`   | `postgres`, `n8n`                      | 5679       |
| `docker-compose.proxy.yml` | `nginx-proxy` (SSL termination)        | 80, 443    |
| `docker-compose.local.yml` | Dev оверрайди                          | —          |

**Docker CLI:** `docker compose` (НЕ `docker-compose`)

### Мережа

Всі сервіси з'єднані через зовнішню мережу `web-gateway`:

```sh
docker network create web-gateway   # або make setup-net
```

### Production Dockerfile (`apps/api/Dockerfile`)

Мультистейджовий білд:

1. **builder** — pnpm install + tsc (з better-sqlite3 нативними залежностями)
2. **runtime** — node:20-slim, копіюємо dist, prod-only залежності

### Pnpm в Docker

```dockerfile
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
```

---

## 7. Деплоймент

### CI/CD Workflow (`.github/workflows/deploy.yml`)

**Тригер:** push to `main` або manual via `workflow_dispatch`

**Процес:**

1. Checkout code
2. Configure SSH key (`HOSTINGER_SSH_KEY` secret)
3. SSH into VPS → `git pull origin main`
4. Run: `make init` (environment), `make rebuild` (Docker)
5. Smoke tests: `make verify-deploy` (frontend + API health)
6. Notify Telegram (success/failure)

**GitHub Secrets Required:**

- `HOSTINGER_SSH_KEY` — Private SSH key (ed25519)
- `HOSTINGER_SSH_USER` — VPS user (default: `vps_user`)
- `HOSTINGER_VPS_HOST` — VPS IP or hostname
- `DEPLOY_PATH` — Repo path on VPS (e.g., `/home/vps_user/astro-vcard`)
- `TELEGRAM_BOT_TOKEN` — For notifications
- `TELEGRAM_MASTER_ID` — Admin Telegram ID

**See:** [DEPLOYMENT.md](./DEPLOYMENT.md) — Complete setup guide

### SSL Certificates

| Середовище | Інструмент                | Команда                              |
| ---------- | ------------------------- | ------------------------------------ |
| Local      | `mkcert`                  | `make cert-local`                    |
| Production | `certbot` (Let's Encrypt) | `make cert-init` (first time)        |
| Auto renew | certbot service           | Automatic (docker-compose.proxy.yml) |
| Manual     | certbot CLI               | `make cert-renew`                    |

### Smoke Tests (`make verify-deploy`)

Automatically runs after deployment:

```bash
✓ 200 OK on https://DOMAIN_NAME/
✓ 200 OK on https://DOMAIN_NAME/api/health
```

If tests fail, deployment is marked as failed in GitHub Actions.

### Env Variables (`.env`)

Обов'язково скопіювати `.example.env` → `.env` на VPS:

| Змінна                | Де потрібна         | Опис                          |
| --------------------- | ------------------- | ----------------------------- |
| `DOMAIN_NAME`         | web, proxy, certbot | Домен сайту (krapelnytsia...) |
| `TELEGRAM_BOT_TOKEN`  | api                 | Токен бота від @BotFather     |
| `TELEGRAM_MASTER_ID`  | api                 | ID адміна (числовой ID)       |
| `BACKEND_PORT`        | api                 | Порт сервера (5678)           |
| `ADMIN_EMAIL`         | certbot             | Email для сертифіката (обов.) |
| `ENABLED_PROVIDERS`   | api                 | `TELEGRAM,EMAIL`              |
| `SMTP_USER`           | api                 | Gmail account (для Email)     |
| `GMAIL_CLIENT_ID`     | api                 | Google Cloud Console          |
| `GMAIL_CLIENT_SECRET` | api                 | Google Cloud Console          |
| `GMAIL_REFRESH_TOKEN` | api                 | OAuth2 flow                   |
| `N8N_ENCRYPTION_KEY`  | n8n                 | Random 32+ chars              |
| `POSTGRES_PASSWORD`   | n8n                 | DB password                   |

---

## 8. Правила для AI-агентів

### Загальні

1. **Менеджер пакетів: pnpm** (v10.29.1). НІКОЛИ npm/yarn.
2. **Українська** — всі UI тексти. `lang="uk"` в HTML.
3. **Англійська** — коміти, технічні коментарі в коді.
4. **Імпорти через `@/`** — ніколи відносні `../../`. Дивись секцію 2.
5. **Без `.js` розширень** в імпортах (moduleResolution: bundler).
6. **Порядок білду:** shared → api → web. Завжди `pnpm build:all`.

### `apps/web` (Astro)

7. **Без JS-фреймворків** — тільки `.astro` компоненти. Без React, Vue, Svelte.
8. **Без client-side JS** — без `<script>`, без `client:*` директив (якщо не попросили явно).
9. **Контент з JSON** — `src/data/content.json` — єдине джерело. Не хардкодь дані.
10. **Scoped стилі** — `<style>` (scoped) всередині компонентів. Глобальні — `<style is:global>` в Layout.
11. **CSS змінні** — `var(--background)`, `var(--text)`, `var(--accent)`. Не хардкодь кольори.
12. **Dark mode** — перевіряй `prefers-color-scheme: dark`. Всі нові стилі повинні працювати.
13. **CSP** — оновлюй `<meta>` в Layout.astro при додаванні зовнішніх ресурсів.
14. **JSON-LD** — оновлюй `Person` schema в Layout.astro при зміні контенту.
15. **Іконки** — `astro-icon` (`<Icon name="..." />`), не інлайн SVG.

### `apps/api` (Hono)

16. **Barrel files** — кожна папка має `index.ts` з реекспортами.
17. **Провайдери** — наслідуй від `BaseNotificationProvider` або `BaseStorageProvider`.
18. **Zod схеми** — додавай в `@vcard/shared`, не в api.
19. **Env валідація** — нові змінні → додай в `src/config/env.config.ts` (zod).
20. **Фабрики** — нові провайдери реєструй в `NotificationFactory`.

### Docker

21. **CLI:** `docker compose` (без дефісу).
22. **Мережа:** всі сервіси в `web-gateway`.
23. **Pnpm в Docker:** `corepack enable && corepack prepare pnpm@10.29.1`.
24. **Secrets:** ніколи не комітити `.env`. Використовуй `.example.env` як шаблон.

---

## 9. Конвенція комітів

Формат: `type(scope): short description`

- **Мова:** Англійська lowercase · **Mood:** imperative · **Без крапки** · **Max 72 chars**
- **Body** (optional): blank line після subject, пояснюй _чому_, не _що_

**ОБОВ'ЯЗКОВО:** кожен комміт повинен мати scope (зі списку нижче).

### Типи

| Тип        | Коли                                |
| ---------- | ----------------------------------- |
| `feat`     | Нова фіча або контент               |
| `fix`      | Виправлення бага                    |
| `style`    | CSS/візуальні зміни (без логіки)    |
| `refactor` | Рефакторинг без зміни поведінки     |
| `docs`     | Документація                        |
| `chore`    | Інструменти, конфіг, залежності, CI |
| `perf`     | Оптимізація продуктивності          |

### Скоупи (Enum)

Scope **ОБОВ'ЯЗКОВИЙ**. Повинен бути одним з:

| Скоуп     | Що зачіпає                           |
| --------- | ------------------------------------ |
| `web`     | `apps/web/*`                         |
| `api`     | `apps/api/*`                         |
| `shared`  | `packages/shared/*`                  |
| `content` | `apps/web/src/data/content.json`     |
| `layout`  | `apps/web/src/layouts/*`             |
| `ui`      | `apps/web/src/components/*`          |
| `seo`     | JSON-LD, мета-теги, sitemap          |
| `csp`     | Content-Security-Policy              |
| `docker`  | Dockerfile, docker-compose, Makefile |
| `ci`      | `.github/workflows/*`                |
| `config`  | tsconfig, astro.config, pnpm         |
| `deps`    | Залежності (package.json)            |

### Приклади

```text
feat(api): add rate limiting to lead submission
feat(web): render projects section with icons
feat(shared): add phone validation regex to lead schema
fix(api): handle empty ENABLED_PROVIDERS gracefully
style(layout): adjust dark mode accent color
refactor(api): extract notification retry logic
chore(docker): pin node image to 20-slim
chore(deps): update astro to 5.17
docs: update AGENTS.md with new architecture
```

---

## 10. MCP сервери (AI інструменти)

Конфіг: `.vscode/mcp.json` та `.github/mcp-servers.json`

| Сервер                 | Контейнер/Пакет                             | Коли використовувати                                            |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| **sequentialthinking** | `mcp/sequentialthinking` (Docker)           | Складні багатокрокові задачі, планування архітектури, debugging |
| **context7**           | `mcp/context7` (Docker)                     | Актуальна документація бібліотек (Astro, Hono, Zod, pnpm)       |
| **memory**             | `@modelcontextprotocol/server-memory` (npx) | Збереження контексту між сесіями                                |

### Рекомендації

- **sequentialthinking** — використовуй для задач >3 кроків. Розбивай на окремі думки.
- **context7** — спочатку `resolve-library-id`, потім `get-library-docs` з конкретним topic.
- **memory** — зберігай архітектурні рішення та їх причини через `create_entities`.
- **Паралельність** — НЕ викликай `semantic_search` паралельно. MCP-сервери можна.
