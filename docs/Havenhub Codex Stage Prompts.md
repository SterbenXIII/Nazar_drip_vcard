# HAVENHUB — промпти Codex та контрольні переходи

Цей документ передає роботу агентам без історії чату. Активна черга: A6 → рішення про інтеграцію; B0 — незалежний read-only аудит; B1–B4 — умовні. Читати специфікацію 00 і плани 01–03 через доступні посилання або переданий експорт. Фактичний checkout і AGENTS.md мають вищий пріоритет за звіти.

# Prompt A6 — поточна перевірка контентного MVP

Ти Codex у Nazar\_drip\_vcard. Активна задача A6 — завершити перевірку наявного контентного MVP, не повторювати A1–A3 і не відкривати редизайн. Знайди \`.worktrees/havenhub-content-mvp\`; прочитай AGENTS.md, фактичний branch/HEAD/status/diff, task-3-report.md, специфікацію 00 та актуалізований план 01\. Якщо Google Drive у твоїй сесії недоступний, попроси експорт цих документів; самі назви не є достатнім контекстом. За переданим звітом 12 файлів \`apps/clinic-web\` змінені без коміту та review APPROVED; підтвердь це з фактичного стану. Виконай fresh Docker build/runtime smoke саме на цьому diff: HTTP, assets, metadata, noindex,nofollow, порожній live-каталог, fail-closed форма, відсутність lead POST; зупини лише свій контейнер. Перевір справжній 200% browser zoom на mobile/desktop і вкажи метод його встановлення, фактичні viewport/scale, overflow, CTA, меню/focus/Escape, FAQ та форму. Не підмінюй zoom зміною viewport. Якщо є дефект, встанови причину, зроби вузьку правку в \`apps/clinic-web\`, повтори релевантні перевірки й незалежний read-only review зміненого diff. Без staging, commit, push, merge, deploy, реальних заявок і змін API/shared/lockfile/infra. Звіт: команди, exit codes, PASS/FAIL/BLOCKED/NOT VERIFIED, змінені файли, залишкові ризики та рішення READY FOR INTEGRATION або BLOCKED; це не publication approval.

# Prompt B0 — lead contract і рішення без коду

Ти Codex, read-only architect. Прочитай AGENTS.md, специфікацію 02, план 03, фактичний API/form/persistence/notifier/Turnstile код і чинний HTTPS webhook decision. Якщо Drive недоступний, отримай експорт документів. Побудуй карту наявного потоку й вкажи, чи вже існує порт доставки. Підготуй decision record для власника: чи потрібен тип залежності на першому кроці; остаточні поля, правила доступу й видалення; privacy-текст і його перевірка; owner тестового bot/chat; точна семантика «заявку прийнято»; retry/idempotency після client timeout і пізнього server success; спостереження за збереженими, але не доставленими заявками; ізоляція синтетичних тестів. Рекомендація — один Telegram adapter для MVP, решта провайдерів окремо. Порівняй рішення з поточним кодом, не нав'язуй нової таблиці, черги чи інтерфейсу до discovery. Вихід — reviewable контракт, питання власнику, критерії B1 і статус BLOCKED до затвердження. Без коду, справжніх заявок, секретів і встановлень.

# Prompt B1 — conditional backend implementation

Виконувати тільки після письмового затвердження B0 контракту та наявності ізольованого тестового одержувача. Читай план «HAVENHUB — 03 Lead delivery staged implementation plan» і AGENTS.md. Виконай B1–B2 через TDD на поточних ownership межах: idempotency, persistence, тонкий port, один Telegram adapter з runtime secret, без silent success. Незалежний review перед B3. Не змінюй frontend форму до затвердження privacy/copy; не додавай Viber/SMTP/Discord в цьому dispatch. Без реальних даних, commit/push/deploy.

# Prompt B3 — conditional form activation

Виконувати після зелених B1–B2 та окремого погодження полів і privacy-тексту. Прочитай фактичний контракт і виконай лише B3: labels/validation/payload, Turnstile lifecycle, fail-closed runtime, keyboard/error states, mock E2E. У контрольованому середовищі перевір синтетичну доставку в тестовий чат; звичайні тести не надсилають зовнішніх POST. Проведи незалежний review і B4 QA. Не знімай noindex і не роби deploy.

# Prompt R — independent review

Ти read-only reviewer. Звір diff проти специфікації, матриці джерел Назара і фактичного AGENTS.md. Перевір ширші за джерело медичні/кількісні твердження, provenance, права/підписи фото, доступність CTA, noindex, publication guard, форму, idempotency і тестову ізоляцію. Повідом findings за severity з файлом/рядком/відтворенням; окремо NOT VERIFIED. Не змінюй код, не схвалюй власну реалізацію.

# Оркестрація та інструменти

Superpowers using-superpowers/verification-before-completion; writing-plans або executing-plans залежно від стадії; systematic-debugging при відтворюваному збої. Build Web Apps frontend-testing-debugging для rendered QA; Browser якщо callable, Playwright fallback і зазначити причину. Context7 лише для конкретної version-specific документації. Доступність plugin/MCP перевірити в поточній сесії; не викликати все формально. Native subagents лише коли конкретна задача і runtime підтримують, розділити файлову власність, independent reviewer read-only; не змішувати з OMX team.

# Критерії переходу

A1–A3 завершені лише за переданим звітом; A6 має дати свіжі докази й рішення про інтеграцію worktree, не виконуючи merge автоматично. B0 — read-only і не активує форму. B1 потребує затвердженого контракту, privacy-рішення та ізольованого одержувача; B3 потребує B1/B2 і тестової доставки. Production потребує окремого дозволу, домену, повного контенту, прав на активи, security і рішення щодо історичних секретів. Локальний PASS не означає publication approval.  
