# HAVENHUB — промпти Codex та контрольні переходи

Цей файл передає конкретний handoff без історії чату. Читай кореневий `AGENTS.md`, цей README, основну spec `docs/superpowers/specs/2026-10-07-havenhub-landing-seo-design.md`, landing plan `docs/superpowers/plans/2026-10-08-havenhub-landing-seo.md`, а для B0 — `06-b0-lead-spec.md` і `07-b0-lead-plan.md` у цьому каталозі. Фактичний checkout і його статус мають пріоритет над старими звітами.

## Стан A6 — завершено; тільки регресійний контекст

A6 перевірили на `codex/havenhub-content-mvp` (`d6e925fa7849c6acd685c23bebede9fe84605832`); фінальна перевірка справжнього 200% browser zoom пройшла. Код інтегрований у `ref/migrate` merge commit `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`. Старий pre-fix overflow finding закритий пізнішою перевіркою.

Не запускай повний A6 цикл повторно як передумову Landing Task 1 та не відкривай нову A6 UI-правку. Для майбутньої зміни в `apps/clinic-web` виконуй лише релевантні перевірки цього diff; справжній 200% zoom і повніший interaction smoke повторюй, коли змінений UI може на них вплинути. Нові дефекти записуй під активним завданням і не розширюй його без окремого дозволу.

## Prompt — review Landing Task 1

Працюй лише з незакоміченим Task 1 diff відносно перевіреного `ref/migrate` `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`. Перед початком звір `HEAD`, staged/unstaged/untracked зміни; не перезаписуй чужі файли. Перевір unset і malformed `CLINIC_SITE_MODE`, точний normal/preview inventory, production approval flag та HTTPS origin, preview gate і послідовність staging → normal. До Task 3 staging/production metadata check має явно називати чотири відсутні supporting pages; це не є готовністю відповідного release. У normal зберігаються тільки `/` і `/404` з `noindex,nofollow`. Перевірки Task 1 не дозволяють production indexing, форму чи deploy. Поверни findings із пріоритетом, відтворенням, base SHA, commands/exit codes та diff hash. Не починай Tasks 2–9.

## Prompt B0 — read-only контракт форми

Прочитай `06-b0-lead-spec.md`, `07-b0-lead-plan.md`, фактичні API/form/persistence/notifier/Turnstile файли та кореневий `AGENTS.md`. Зістав запропонований контракт із наявним API; не припускай, що route, таблиця або delivery port вже існують. Підготуй питання власнику щодо полів, доступу й видалення, privacy/consent, тестового bot/chat, семантики прийняття, retry/idempotency та спостереження за збереженими, але недоставленими заявками. Вкажи mock-only критерії. Не змінюй код, не надсилай заявки й не використовуй реальні персональні дані. Статус лишається BLOCKED до рішення власника.

## Prompt B1 — умовна реалізація бекенду

Виконуй тільки після письмового затвердження B0 контракту та ізольованого test recipient. Читай `07-b0-lead-plan.md` і фактичний API ownership/contract. Реалізуй лише погоджені backend кроки через TDD з синтетичними даними й mock provider; збережи delivery failure/retry та idempotency семантику. Незалежний review — перед UI-інтеграцією. Без реальних заявок, production secrets, commit/push/deploy.

## Prompt B3 — умовне ввімкнення форми

Виконуй після зелених узгоджених backend етапів, затвердженого privacy тексту та окремого рішення про UI інтеграцію. Дотримуйся форми й fail-closed gate із `07-b0-lead-plan.md`: без погодженої конфігурації форма недоступна і не створює POST. Перевір labels, validation, keyboard/error states і synthetic mock delivery. Не надсилай зовнішніх заявок, не вмикай production indexing і не роби deploy.

## Prompt R — незалежний read-only review

Звір diff із основною spec, джерелами/статусами тверджень і фактичним `AGENTS.md`. Перевір scope, publication guard, noindex, form state, контакти, accessibility, provenance/rights і тестову ізоляцію. Повідом findings за severity з файлом, рядком і відтворенням; відокрем NOT VERIFIED. Не змінюй код і не схвалюй власну реалізацію.

## Критерії переходу

A6 завершено та інтегровано на вказаних SHA; старий overflow finding не є поточним blocker. Landing Task 1 проходить окремий diff review і перевірки на його актуальному base. Tasks 2–8 лишаються окремими етапами landing plan; Task 9 використовує наявні B0 spec/plan як вихідні документи й не активує реалізацію. Форма лишається fail-closed. Production потребує окремого дозволу, підтвердженого домену, погодженого контенту й прав на матеріали, закриття security gates та перевірки реальних CDN/HTTP headers. Жоден локальний PASS не є publication approval.
