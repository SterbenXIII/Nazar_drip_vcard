# HAVENHUB — пакет передачі реалізації

**Версія пакета:** 2026-10-08. **Перевірений baseline:** `ref/migrate` на `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`; merge commit має батьком A6 `d6e925fa7849c6acd685c23bebede9fe84605832`. A6 інтегрований; його фінальний 200% zoom пройшов. Пакет є брифом і планом, не дозволом на публікацію. Поточний Task 1 diff окремий і незакомічений; перед продовженням перевіряй фактичні `HEAD`, status та diff. Репозиторій: `SterbenXIII/Nazar_drip_vcard`, застосунок `apps/clinic-web`. Кореневий `AGENTS.md` має пріоритет щодо процесу й Git.

## Як читати

1. [Основна специфікація](../superpowers/specs/2026-10-07-havenhub-landing-seo-design.md) — продукт, тексти, маршрути, SEO, межі тверджень.
2. [Рішення й залежності](01-scope-decisions.md) — що відомо, що потребує відповіді, послідовність потоків.
3. [Контент і SEO](02-content-seo.md) — карта секцій, запитів, тверджень і метаданих.
4. [Візуальний бриф](03-design-brief.md) — макети, шрифти, фото, responsive; [робочі тексти](08-copy-draft.md) — конкретний copy draft для п'яти сторінок.
5. [Основний план](../superpowers/plans/2026-10-08-havenhub-landing-seo.md) — завдання 1–8 для landing, завдання 9 як B0 handoff.
6. [B0: форма → бот](06-b0-lead-spec.md) і [B0 план](07-b0-lead-plan.md) — окремий потік з API та приватними даними.
7. [QA і release](04-qa-release.md) — матриця доказів, індексація, rollback.
8. [Промпти](05-prompts.md) — готові handoff-повідомлення для послідовних Codex сесій.

## Послідовність

`Підтвердження фактів і дизайну → Landing Tasks 1–8 → staging QA → Task 9: review/reconcile B0 spec і plan → окремо затверджена B0 реалізація та інтеграція форми → production release review → окремий публічний запуск`.

Task 9 є handoff/планом, не дозволом почати B0 код. Наявні `06-b0-lead-spec.md` і `07-b0-lead-plan.md` — вихідні документи B0; не створювати дублікати без конкретної прогалини, виявленої read-only review.

Доки немає підтвердженого домену та release approval, default build залишається `noindex,nofollow` і містить лише `/` та `/404`. Закритий staging потребує авторизації. Public production: індексується лише `/`; `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/` доступні людям і мають `noindex`.

## Що передавати між етапами

Кожен виконавець фіксує base commit, точні змінені файли, виконані команди та PASS/FAIL/BLOCKED/NOT VERIFIED, скриншоти desktop/mobile, відкриті рішення і наступний крок. Не позначати перевірку PASS на основі старого CI чи локального скриншота. Жодна задача не передбачає автоматичного commit, push або deploy.
