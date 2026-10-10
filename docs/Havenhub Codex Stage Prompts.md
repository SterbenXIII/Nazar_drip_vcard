# HAVENHUB — промпти Codex та контрольні переходи

Цей документ передає роботу агентам без історії чату. A6 завершено й інтегровано; поточна задача — Landing Task 1 на базі `ref/migrate` `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`. Читай кореневий `AGENTS.md`, `docs/havenhub-kit/README.md`, основну spec і landing plan за локальними посиланнями README. Фактичний checkout і його статус мають вищий пріоритет за старі звіти.

# A6 — завершено; регресійний контекст

A6 перевірили на worktree `d6e925fa7849c6acd685c23bebede9fe84605832`; фінальна перевірка справжнього 200% zoom пройшла. Код інтегровано у `ref/migrate` merge commit `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`. Не повторюй повний A6 Docker/zoom цикл як передумову landing і не трактуй старий pre-fix overflow finding як поточний blocker. Для пізніших UI змін виконуй відповідні регресійні перевірки на новому SHA; справжній zoom повторюй, якщо змінений layout може вплинути на reflow або взаємодію. Не дозволяй нову A6 UI-правку поза scope актуального завдання.

# Prompt — Landing Task 1

Реалізуй лише Task 1 з `docs/superpowers/plans/2026-10-08-havenhub-landing-seo.md` через TDD. Перевір `ref/migrate` `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`, exact route inventory, unset/malformed mode, preview gate і staging → normal. Normal build лишається `noindex,nofollow`; у Task 1 не додавай production indexing, форму чи deploy. До Task 3 staging/production checks мають пояснювати відсутність чотирьох supporting pages, а не оголошувати release готовим. Не починай Tasks 2–9.

# Prompt B0 — lead contract і рішення без коду

Ти Codex, read-only architect. Прочитай `docs/havenhub-kit/06-b0-lead-spec.md`, `docs/havenhub-kit/07-b0-lead-plan.md`, фактичний API/form/persistence/notifier/Turnstile код і чинні рішення. Побудуй карту наявного потоку й вкажи, чи вже існує порт доставки. Підготуй decision record для власника: потрібні поля, правила доступу й видалення, privacy-текст, owner тестового bot/chat, семантика «заявку прийнято», retry/idempotency після timeout, спостереження за збереженими, але недоставленими заявками та ізоляція синтетичних тестів. Порівняй із чинним кодом, не вигадуй API, таблиць чи owner-рішень. Вихід — findings до B0 spec/plan і статус BLOCKED до затвердження. Без коду, реальних заявок, секретів та інсталяцій.

# Prompt B1 — conditional backend implementation

Виконувати тільки після письмового затвердження B0 контракту та наявності ізольованого тестового одержувача. Читай `docs/havenhub-kit/07-b0-lead-plan.md` та `AGENTS.md`. Виконай лише погоджені backend етапи через TDD на поточних ownership межах. Незалежний review перед UI інтеграцією. Не змінюй frontend форму до затвердження privacy/copy; не додавай Viber/SMTP/Discord у цей dispatch. Без реальних даних, commit/push/deploy.

# Prompt B3 — conditional form activation

Виконувати після зелених B1–B2 та окремого погодження полів і privacy-тексту. Прочитай фактичний контракт і виконай лише B3: labels/validation/payload, Turnstile lifecycle, fail-closed runtime, keyboard/error states, mock E2E. У контрольованому середовищі перевір синтетичну доставку в тестовий чат; звичайні тести не надсилають зовнішніх POST. Проведи незалежний review і B4 QA. Не знімай noindex і не роби deploy.

# Prompt R — independent review

Ти read-only reviewer. Звір diff проти специфікації, матриці джерел Назара і фактичного AGENTS.md. Перевір ширші за джерело медичні/кількісні твердження, provenance, права/підписи фото, доступність CTA, noindex, publication guard, форму, idempotency і тестову ізоляцію. Повідом findings за severity з файлом/рядком/відтворенням; окремо NOT VERIFIED. Не змінюй код, не схвалюй власну реалізацію.

# Оркестрація та інструменти

Superpowers using-superpowers/verification-before-completion; writing-plans або executing-plans залежно від стадії; systematic-debugging при відтворюваному збої. Build Web Apps frontend-testing-debugging для rendered QA; Browser якщо callable, Playwright fallback і зазначити причину. Context7 лише для конкретної version-specific документації. Доступність plugin/MCP перевірити в поточній сесії; не викликати все формально. Native subagents лише коли конкретна задача і runtime підтримують, розділити файлову власність, independent reviewer read-only; не змішувати з OMX team.

# Критерії переходу

A6 завершено на `d6e925fa7849c6acd685c23bebede9fe84605832` і інтегровано у `ref/migrate` merge commit `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`; його фінальна перевірка справжнього 200% zoom пройшла. Landing Task 1 реалізується окремо від цієї бази; повний A6 цикл і старий pre-fix overflow finding не є його gates. Tasks 2–9 і B0 лишаються окремими етапами; B1 потребує затвердженого контракту, privacy-рішення та ізольованого одержувача. Production потребує окремого дозволу, домену, повного контенту, прав на активи, security і рішення щодо історичних секретів. Локальний PASS не означає publication approval.
