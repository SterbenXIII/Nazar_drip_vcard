# --- Завантаження змінних ---
-include .env
export

# --- Конфігурація шляхів та Docker ---
# Compose service names include vcard-api, vcard-clinic-web, n8n, and vcard-proxy.
DC_APP         = docker compose -p astro-vcard -f ops/docker/compose/docker-compose.yml
DC_N8N         = docker compose -p astro-vcard -f ops/docker/compose/docker-compose.n8n.yml
DC_PROXY       = docker compose -p astro-vcard -f ops/docker/compose/docker-compose.proxy.yml
DC_STACK       = docker compose -p astro-vcard -f ops/docker/compose/docker-compose.yml -f ops/docker/compose/docker-compose.proxy.yml
DC_LOCAL       = $(DC_APP) -f ops/docker/compose/docker-compose.proxy.yml -f ops/docker/compose/docker-compose.local.yml
DC_LOCAL_ALL   = $(DC_APP) -f ops/docker/compose/docker-compose.n8n.yml -f ops/docker/compose/docker-compose.proxy.yml -f ops/docker/compose/docker-compose.local.yml

LOCAL_CERT_DIR = ./ops/certs/local
NETWORK        = web-gateway
BACKUP_DIR     = ./backups
DB_PATH        = ./apps/api/data/leads.db
TG_SEND_DOC    = https://api.telegram.org/bot$(TELEGRAM_BOT_TOKEN)/sendDocument
CLINIC_PNPM    = env -i PATH="$$PATH" HOME="$$HOME" pnpm --filter @vcard/clinic-web
DC_CLINIC      = env -i PATH="$$PATH" HOME="$$HOME" docker compose --env-file /dev/null -p vcard-clinic-local -f ops/docker/compose/docker-compose.clinic-web.yml

# Кольори для терміналу
BLUE   = \033[1;34m
GREEN  = \033[1;32m
YELLOW = \033[1;33m
RED    = \033[1;31m
NC     = \033[0m

.PHONY: help init setup-net build dev dev-down dev-rebuild up down rebuild logs ps clean clean-all backup-to-tg db-check verify-deploy refresh deploy-setup secret-scan secret-history-scan remote-preflight-dev remote-deploy-dev remote-preflight-prod remote-deploy-prod remote-status remote-logs remote-logs-follow remote-backup remote-recover remote-rollback clinic-shared clinic-dev clinic-build clinic-preview clinic-content-preview clinic-check clinic-acceptance clinic-docker-build clinic-docker-up clinic-docker-down clinic-docker-logs clinic-docker-check check-stage-auth

# --- Допомога ---

help:
	@echo "$(BLUE)Доступні команди:$(NC)"
	@echo "  $(GREEN)make init$(NC)           - Підготувати структуру проєкту та встановити залежності"
	@echo "  $(GREEN)make build$(NC)          - Скомпілювати всі пакети воркспейсу (shared, api, web, clinic-web)"
	@echo "  $(GREEN)make dev$(NC)            - Запустити весь стек LOCAL (Astro + Hono + n8n + Proxy)"
	@echo "  $(GREEN)make clinic-dev$(NC)     - Локальний Astro dev server на 127.0.0.1:4322"
	@echo "  $(GREEN)make clinic-build$(NC)   - Зібрати звичайну clinic-web версію"
	@echo "  $(GREEN)make clinic-preview$(NC) - Зібрати normal і переглянути її на 127.0.0.1:4322"
	@echo "  $(GREEN)make clinic-content-preview$(NC) - Локальне opt-in демо контенту, noindex"
	@echo "  $(GREEN)make clinic-check$(NC)   - Astro check, ESLint, Stylelint, Prettier"
	@echo "  $(GREEN)make clinic-acceptance$(NC) - Повне локальне приймання з mock даними"
	@echo "  $(GREEN)make clinic-docker-build$(NC) - Зібрати clinic image з API proxy"
	@echo "  $(GREEN)make clinic-docker-up$(NC) - Запустити API й clinic на http://127.0.0.1:4323"
	@echo "  $(GREEN)make clinic-docker-down$(NC) - Зупинити лише clinic project"
	@echo "  $(GREEN)make clinic-docker-logs$(NC) - Логи clinic project"
	@echo "  $(GREEN)make clinic-docker-check$(NC) - HTTP і браузерний smoke clinic container"
	@echo "  $(GREEN)make refresh$(NC)        - Ядерне очищення: видалення node_modules та перевстановлення"
	@echo ""
	@echo "  $(RED)make deploy-setup$(NC)     - Legacy helper disabled; see ops/ansible/README.md"
	@echo ""
	@echo "  $(GREEN)make backup-to-tg$(NC)   - Зробити бекап SQLite та відправити в Telegram"
	@echo "  $(GREEN)make db-check$(NC)       - Переглянути останні записи в БД всередині контейнера"
	@echo "  $(GREEN)make logs$(NC)           - Переглянути логи всіх контейнерів"
	@echo "  $(GREEN)make verify-deploy$(NC)  - Smoke тести (200 OK для web та /api/health)"
	@echo "  $(GREEN)make secret-scan$(NC)    - Redacted current-tree Gitleaks scan"

# --- Ініціалізація та Керування Пакетами ---

init: setup-net
	@echo "$(BLUE)🛠 Ініціалізація монорепозиторію...$(NC)"
	@mkdir -p backups apps/api/data
	@test -f apps/api/allowed_chats.json || echo "[]" > apps/api/allowed_chats.json
	@test -f .env || (echo "$(RED)Помилка: Створи .env файл!$(NC)" && exit 1)
	@pnpm install
	@echo "$(GREEN)✅ Структура та залежності готові.$(NC)"

setup-net:
	@docker network inspect $(NETWORK) >/dev/null 2>&1 || \
		(echo "$(BLUE)🌐 Створення мережі: $(NETWORK)$(NC)" && docker network create $(NETWORK))



build:
	@echo "$(BLUE)🏗 Компіляція TypeScript проектів...$(NC)"
	pnpm build:all

# The root .env is exported for existing targets; clinic children receive only PATH and HOME.
clinic-shared:
	@pnpm --filter @vcard/shared build

clinic-dev: clinic-shared
	@$(CLINIC_PNPM) dev

clinic-build: clinic-shared
	@$(CLINIC_PNPM) build:normal

clinic-preview: clinic-shared
	@$(CLINIC_PNPM) preview:normal

clinic-content-preview: clinic-shared
	@$(CLINIC_PNPM) preview:content

clinic-check: clinic-shared
	@$(CLINIC_PNPM) check

clinic-acceptance: clinic-shared
	@$(CLINIC_PNPM) acceptance

clinic-docker-build:
	@$(DC_CLINIC) build clinic-web

clinic-docker-up: setup-net
	@$(DC_APP) up -d api
	@$(DC_CLINIC) up -d --no-build --wait --wait-timeout 60 clinic-web

clinic-docker-down:
	@$(DC_CLINIC) down

clinic-docker-logs:
	@$(DC_CLINIC) logs --tail=50 clinic-web

clinic-docker-check:
	@container_id=$$($(DC_CLINIC) ps -q clinic-web); \
		test -n "$$container_id" && test "$$(env -i PATH="$$PATH" HOME="$$HOME" docker inspect --format '{{.State.Health.Status}}' "$$container_id")" = healthy
	@$(CLINIC_PNPM) exec node scripts/docker-check.mjs

lint:
	@pnpm lint

refresh:
	@echo "$(RED)♻️ Повне перезавантаження: видалення node_modules та lock-файлу...$(NC)"
	rm -rf node_modules **/node_modules pnpm-lock.yaml
	pnpm install
	@echo "$(GREEN)✨ Залежності оновлено.$(NC)"

force-clean:
	@echo "$(RED)🔥 АГРЕСИВНЕ ОЧИЩЕННЯ: Видалення node_modules через sh...$(NC)"
	sh -c 'chmod -R 777 node_modules apps/*/node_modules .pnpm-store 2>/dev/null || true'
	sh -c 'rm -rf node_modules apps/*/node_modules .pnpm-store .alt-pnpm-store pnpm-lock.yaml || true'
	@echo "$(GREEN)✨ Модулі видалено. Тепер можна запустити pnpm install.$(NC)"

# --- Deployment Setup (ONE-TIME) ---

deploy-setup:
	@echo "$(RED)Legacy VPS setup helper is disabled for the authenticated HTTPS stage.$(NC)"
	@echo "See ops/ansible/README.md for the current deployment contract."
	@exit 1

# --- Розробка & Продакшн ---

dev: setup-net
	@echo "$(BLUE)🚀 Запуск локального середовища (без SSL)...$(NC)"
	$(DC_LOCAL) up -d --build
	@echo "$(GREEN)🔗 Frontend: http://localhost:4321$(NC)"
	@echo "$(GREEN)🔗 API:      http://localhost:5678$(NC)"

dev-down:
	$(DC_LOCAL) down

up: check-stage-auth setup-net
	@echo "$(GREEN)🚀 Запуск PRODUCTION стеку...$(NC)"
	$(DC_STACK) up -d --remove-orphans

down:
	@echo "$(YELLOW)🛑 Зупинка всіх сервісів...$(NC)"
	$(DC_APP) down 2>/dev/null || true
	$(DC_PROXY) down 2>/dev/null || true
	$(DC_N8N) down 2>/dev/null || true
	$(DC_LOCAL) down 2>/dev/null || true

dev-rebuild: dev-down
	@echo "$(YELLOW)🔄 Перезбірка LOCAL образів та запуск...$(NC)"
	$(DC_LOCAL) up -d --build

rebuild: check-stage-auth
	$(MAKE) down
	$(MAKE) setup-net
	@echo "$(YELLOW)🔄 Перезбірка PRODUCTION образів та запуск...$(NC)"
	$(DC_STACK) up -d --build --force-recreate --remove-orphans

check-stage-auth:
	@test -n "$${STAGE_BASIC_AUTH_HASH}" || (echo "$(RED)Set STAGE_BASIC_AUTH_HASH before starting the protected stage stack.$(NC)" && exit 1)

# --- Обслуговування & Логи ---

logs:
	@echo "$(BLUE)📋 Потік логів (останні 50 рядків)...$(NC)"
	$(DC_LOCAL) logs -f --tail=50

ps:
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

db-check:
	@echo "$(BLUE)📂 Останні 5 заявок у SQLite (контейнер vcard-api):$(NC)"
	@docker exec -it vcard-api sqlite3 /app/data/leads.db \
		"SELECT id, name, phone, services, district, timestamp FROM leads ORDER BY id DESC LIMIT 5;"

backup-to-tg:
	@echo "$(BLUE)📦 Підготовка бекапу бази даних...$(NC)"
	@mkdir -p $(BACKUP_DIR)
	$(eval TIMESTAMP := $(shell date +%Y-%m-%d_%H-%M-%S))
	$(eval BACKUP_FILE := $(BACKUP_DIR)/leads_$(TIMESTAMP).db)
	# Використовуємо sqlite3 CLI для безпечного бекапу
	@sqlite3 $(DB_PATH) ".backup '$(BACKUP_FILE)'"
	@echo "$(BLUE)📤 Відправка в Telegram (@$(TELEGRAM_MASTER_ID))...$(NC)"
	@curl -s -F chat_id="$(TELEGRAM_MASTER_ID)" \
		-F document=@"$(BACKUP_FILE)" \
		-F caption="📦 Leads DB Backup | $(TIMESTAMP)" \
		$(TG_SEND_DOC) > /dev/null && \
		echo "$(GREEN)✅ Бекап надіслано!$(NC)" || \
		echo "$(RED)❌ Помилка відправки.$(NC)"
	@rm "$(BACKUP_FILE)"

# --- Очищення ---

clean:
	@echo "$(YELLOW)🧹 Очищення тимчасових файлів білду...$(NC)"
	pnpm -r exec rm -rf dist .astro .tsbuildinfo
	docker system prune -f

clean-all: down
	@echo "$(RED)🔥 ПОВНЕ видалення (волюми, образи, мережі, залежності)...$(NC)"
	$(DC_LOCAL) down -v --rmi local --remove-orphans || true
	@docker network rm $(NETWORK) 2>/dev/null || true
	rm -rf node_modules **/node_modules pnpm-lock.yaml apps/api/data/*.db
	@echo "$(GREEN)✨ Система очищена до початкового стану.$(NC)"


verify-deploy:
	@test -n "$${STAGE_BASIC_AUTH_PASSWORD}" || (echo "$(RED)Set STAGE_BASIC_AUTH_PASSWORD to run authenticated smoke checks.$(NC)" && exit 1)
	@echo "$(BLUE)🔍 Перевірка розгортання...$(NC)"
	@sleep 15
	@echo "🌐 Перевірка фронтенду..."
	@stage_curl_auth="stage:$${STAGE_BASIC_AUTH_PASSWORD}"; \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" --user "$$stage_curl_auth" --max-time 15 "https://$(DOMAIN_NAME)"); \
	if [ "$$STATUS" = "200" ]; then \
		echo "$(GREEN)✅ Frontend OK ($$STATUS)$(NC)"; \
	else \
		echo "$(RED)❌ Frontend помилка: $$STATUS$(NC)" && exit 1; \
	fi
	@echo "🔧 Перевірка API health..."
	@stage_curl_auth="stage:$${STAGE_BASIC_AUTH_PASSWORD}"; \
	STATUS=$$(curl -s -o /dev/null -w "%{http_code}" --user "$$stage_curl_auth" --max-time 15 "https://$(DOMAIN_NAME)/api/health"); \
	if [ "$$STATUS" = "200" ]; then \
		echo "$(GREEN)✅ API OK ($$STATUS)$(NC)"; \
	else \
		echo "$(RED)❌ API помилка: $$STATUS$(NC)" && exit 1; \
	fi
	@echo "$(GREEN)✨ Усі перевірки пройдені!$(NC)"

# --- Security Scanning ---
scan:
	@echo "$(BLUE)🛡️ Running local security scan with Trivy...$(NC)"
	@echo "Ignored directories: $$(git status --ignored --porcelain | grep '^!!' | grep '/$$' | cut -c 4- | sed 's/\/$$//' | tr '\n' ',' | sed 's/,$$//')"
	@docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $(HOME)/.cache/trivy:/root/.cache/trivy \
		-v $(PWD):/project \
		aquasec/trivy config /project --severity CRITICAL,HIGH --exit-code 1 \
		--skip-dirs $$(git status --ignored --porcelain | grep '^!!' | grep '/$$' | cut -c 4- | sed 's/\/$$//' | tr '\n' ',' | sed 's/,$$//')

secret-scan:
	@./scripts/secret-scan.sh dir

secret-history-scan:
	@./scripts/secret-scan.sh history

# --- Separate DefGuard SSH deployment (does not alter local targets above) ---

remote-preflight-dev:
	@./scripts/remote.sh preflight dev

remote-deploy-dev:
	@./scripts/remote.sh deploy dev

remote-preflight-prod:
	@./scripts/remote.sh preflight prod

remote-deploy-prod:
	@./scripts/remote.sh deploy prod

remote-status:
	@./scripts/remote.sh status

remote-logs:
	@./scripts/remote.sh logs

remote-logs-follow:
	@./scripts/remote.sh logs --follow

remote-backup:
	@./scripts/remote.sh backup

remote-recover:
	@if [ -n "$(RESTORE_ID)" ]; then ./scripts/remote.sh recover restore "$(RESTORE_ID)"; else ./scripts/remote.sh recover; fi

remote-rollback:
	@test -n "$(RELEASE_ID)" || (echo "BLOCKED: RELEASE_ID is required" >&2 && exit 2)
	@./scripts/remote.sh rollback "$(RELEASE_ID)"

debug:
	@echo "Ignored directories: $$(git status --ignored --porcelain | grep '^!!' | grep '/$$' | cut -c 4- | sed 's/\/$$//' | tr '\n' ',' | sed 's/,$$//')"
