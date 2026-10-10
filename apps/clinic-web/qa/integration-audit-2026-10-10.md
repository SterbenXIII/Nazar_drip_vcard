# HAVENHUB — передінтеграційний аудит worktree

**Дата:** 2026-10-10. **База:** `ref/migrate` на `2d850a0`. **Feature:** `codex/havenhub-supporting-pages` на `4585559` (до додавання цього аудиту). **Статус:** план інтеграції, **merge не виконано**.

## Контракт безпеки

Аудит виконувався лише на читання щодо основного checkout: жодного `git add`, `stash`, `reset`, `clean`, `checkout`, `merge` або копіювання приватних файлів там не виконувалося. Основний checkout містить власні незакомічені зміни з окремими staged/unstaged версіями; не вважати його disposable.

- 29 відмінних від HEAD шляхів у головному checkout: **25 перетинаються з feature**, **4 є лише локальними untracked**. Серед чотирьох — приватні документи замовника та окремий файл агента; їх не додавати в Git, у патч для інтеграції чи публічні артефакти.
- Із 25 спільних шляхів **19 робочих файлів побайтово ідентичні feature**, а **6 різняться**.
- Для **7** перетинів index blob ідентичний feature; для **18** index містить інший стан — включно з попередніми версіями файлів, які на диску вже збігаються з feature.
- `ref/migrate` є предком feature: **fast-forward технічно можливий у чистому checkout**, але поточний основний index/worktree не чистий.

## Побайтові збіги: зберегти кінцевий feature-вміст

Наведені 19 шляхів у основній **робочій копії** вже ідентичні відповідним об’єктам feature. У деяких із них index застарілий; не повертати їх до старих staged-версій.

| Шлях | Робочий вміст | Дія після збереження staged-стану |
| --- | --- | --- |
| `.github/workflows/clinic-web-ci.yml` | Ідентичний | Feature |
| `.gitignore` | Ідентичний | Feature |
| `apps/clinic-web/e2e/landing-content.spec.ts` | Ідентичний | Feature |
| `apps/clinic-web/package.json` | Ідентичний | Feature |
| `apps/clinic-web/src/content/claims.ts` | Ідентичний | Feature |
| `apps/clinic-web/src/content/customer-materials.ts` | Ідентичний | Feature |
| `apps/clinic-web/src/content/landing.ts` | Ідентичний | Feature |
| `docs/Havenhub Codex Stage Prompts.md` | Ідентичний | Feature |
| `docs/Havenhub Frontend Implementation Plan.md` | Ідентичний | Feature |
| `docs/havenhub-kit/01-scope-decisions.md` | Ідентичний | Feature |
| `docs/havenhub-kit/02-content-seo.md` | Ідентичний | Feature |
| `docs/havenhub-kit/03-design-brief.md` | Ідентичний | Feature |
| `docs/havenhub-kit/04-qa-release.md` | Ідентичний | Feature |
| `docs/havenhub-kit/05-prompts.md` | Ідентичний | Feature |
| `docs/havenhub-kit/08-copy-draft.md` | Ідентичний | Feature |
| `docs/havenhub-kit/Havenhub Frontend Implementation Plan.md` | Ідентичний | Feature |
| `docs/havenhub-kit/README.md` | Ідентичний | Feature |
| `docs/superpowers/plans/2026-10-08-havenhub-landing-seo.md` | Ідентичний | Feature |
| `docs/superpowers/specs/2026-10-07-havenhub-landing-seo-design.md` | Ідентичний | Feature |

## Шість відмінностей: review результату, а не автоматичне застосування патчів

| Шлях | Порівняння main → feature | Рекомендація |
| --- | --- | --- |
| `apps/clinic-web/astro.config.mjs` | Feature централізує валідацію режимів та додає gated SEO/sitemap hook і перевірку теми | Залишити feature; повторно перевірити closed production gate |
| `apps/clinic-web/e2e/publication.spec.ts` | Main перевіряє проміжні очікувані відмови staging; feature тестує кінцеву матрицю SEO й publication | Залишити feature; перевірити весь publication suite |
| `apps/clinic-web/scripts/acceptance.mjs` | Feature додає нормальні й staging браузерні/a11y прогони | Залишити feature; повний acceptance потребує Node 24 runtime |
| `apps/clinic-web/scripts/check-metadata.mjs` | Feature перевіряє canonical/robots/social/sitemap у трьох режимах | Залишити feature; main має корисні деталізовані missing/unexpected route diagnostics, які можна відновити окремим follow-up |
| `docs/havenhub-kit/06-b0-lead-spec.md` | Feature додає Task 9 звірку з кодом, приватність, outbox/idempotency та непогоджені рішення | Залишити feature; це ще не погодження backend B0 |
| `docs/havenhub-kit/07-b0-lead-plan.md` | Feature уточнює фактичний API й відсутність форми та failure tests | Залишити feature; не активувати UI/API |

Це рекомендація з перегляду змін, **не автоматична доказова еквівалентність** поведінки. Зберегти оригінальні staged/unstaged версії для можливості відновлення.

## Рекомендований контрольований порядок інтеграції

1. **Не чіпати основний checkout до явного дозволу.** Зафіксувати HEAD, index та checksums змінених файлів; резервна копія має відтворювати **окремо** staged й unstaged шари. Перевірити відновлюваність копії.
2. Приватні main-only untracked файли залишити окремо від Git та будь-яких commit/stash/PR. **Не використовувати `git stash -u`**: він може включити приватні документи в Git object database.
3. Найменш інвазивний наступний крок — окремий PR із `codex/havenhub-supporting-pages` у `ref/migrate` після явного дозволу на push. **Локальний main checkout залишається без змін.**
4. Якщо потрібен саме **локальний fast-forward**, спершу отримати окремий дозвіл на операції в основному checkout. Тоді зробити перевірену приватну резервну копію index/обох шарів diff та main-only файлів, відкласти конфліктні untracked збіги поза checkout, прибрати лише відтворені дублі, виконати `git merge --ff-only codex/havenhub-supporting-pages`, перевірити HEAD/файли/тести, і зберегти main-only приватні дані. Нічого не видаляти без перевіреної копії.
5. Повторити `clinic-web check`, build:normal + metadata, normal/staging Chromium та Docker smoke; для release залишаються окремі gates: історичні секрети, Node 24 acceptance, true zoom 200%, незалежний review і owner-approved canonical/domain/дані.

**Поточний висновок:** структура committed Git-гілок придатна для fast-forward, але **робочий основний checkout несумісний із безпосереднім merge без попередньої консервації**. До окремого дозволу обрати «feature/PR без змін main», не виконувати merge, push або cleanup.
