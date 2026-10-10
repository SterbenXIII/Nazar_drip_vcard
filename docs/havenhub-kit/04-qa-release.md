# Перевірки та release gate

## Матриця збірок

| Режим | Маршрути HTML | Robots | Sitemap | Доступ |
| --- | --- | --- | --- | --- |
| Normal за замовчуванням | `/`, `/404`; existing preview лише за своїм прапорцем у normal mode | Весь HTML `noindex,nofollow` | Немає | Локальний/поточний артефакт |
| Staging | П'ять сторінок + `/404` | Всі `noindex` | Не подавати | Авторизація на рівні середовища |
| Production після gate | П'ять сторінок + `/404` | `/`: `index,follow`; чотири: `noindex`; 404: `noindex` | Лише canonical `/` | Публічний HTTPS |

## Acceptance — фіксувати результат і артефакт

1. **Файлова інвентаризація:** чисті послідовні build `staging → normal`, точний список HTML, немає старих `dist` файлів і preview у production.
2. **SEO:** robots meta, actual `X-Robots-Tag`, canonical, title, description, OG, sitemap, robots.txt, status; перевірка source HTML і HTTP після reverse proxy/CDN. `robots.txt` не приховує noindex сторінки від crawler. Правило: https://developers.google.com/search/docs/crawling-indexing/block-indexing
3. **Зміст:** локація центру — Львівська область; виїзд — Львів та область; 24/7 лише гаряча лінія; безкоштовна лише перша первинна консультація; ціна після консультації; три напрями окремо від форматів; жодних обіцянок одужання.
4. **Навігація:** посилання працюють у відповідному режимі, CTA `tel:+380779742422` і `https://t.me/HavenRehub` на кожній сторінці; у normal немає посилань на невидані сторінки.
5. **Доступність:** один H1, landmarks, focus, Escape та повернення фокуса, короткий mobile viewport, 320 px reflow, справжній 200% zoom, axe, reduced motion, підписи/alt.
6. **B0:** до запуску немає POST із public UI. Після окремої реалізації — серверна валідація, антиспам, failure/retry, тестова доставка у test chat, privacy/consent, відсутність бот-токена в клієнті.
7. **Якість:** Node >=24, pnpm 10.29.1, frozen install, `pnpm --filter @vcard/clinic-web check`, acceptance, relevant Playwright, normal/staging/build metadata, Docker smoke, Markdownlint, `git diff --check`, secret scan. Full-history findings звітувати окремо від поточного дерева.

## Ворота публікації

- Контент owner підтвердив усі факти, медичні формулювання й права на фінальні фото.
- Верифікований домен і HTTPS canonical; exact production build opt-in; staging за авторизацією.
- Історичні секрети оброблені згідно з чинним release gate; немає випадкового витоку конфігурації у HTML/image.
- Якщо форма входить до релізу, B0 інтеграційні тести PASS і повідомлення доставляється за погодженим контрактом; інакше публічний контакт — лише телефон і Telegram.
- Після окремого схвалення release перевірити реальні response headers, redirect www/non-www та HTTP→HTTPS, sitemap і Search Console. У разі помилки індексації повернути попередній артефакт, перевірити HTTP/robots, зберегти діагностику; не відкривати індексування «вручну» без нового build/review.

## Майбутній окремий крок: дозвіл на публічне індексування

На етапі Task 1 `Layout.astro` лишається `noindex,nofollow` в усіх режимах. `check-metadata.mjs` перевіряє mode-aware точний inventory: normal містить `/` і `/404` (та лише явно дозволений preview), а staging і production мають повідомляти про чотири відсутні supporting pages до Task 3. Це не означає готовність staging/production release. Публічне indexing перевіряють лише після реалізації й review Tasks 3 та 7, підтвердження домену й окремого схвалення власника.

1. На чистих normal, закритому staging та gated production build звірити точний список HTML. Normal видає лише `/` і `/404` з `noindex,nofollow`; staging видає `/`, `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/` за авторизацією з `noindex`; production видає ці п'ять сторінок, де тільки `/` може мати `index,follow`, а чотири допоміжні залишаються доступними людям з `noindex`.
2. Для кожного режиму перевірити robots meta в HTML і фактичні HTTP headers після proxy/CDN. Для production `/` перевірити затверджений HTTPS self-canonical, title і description та відсутність глобального `X-Robots-Tag: noindex`; для чотирьох допоміжних сторінок перевірити `noindex` без блокування crawler у `robots.txt`.
3. Перевірити sitemap: у production лише затверджений HTTPS URL `/`; у normal і staging публічного sitemap немає. Зберегти артефакти перевірок і рішення власника. За відсутності домену, approval або перевірки доставленого HTTP результат — BLOCKED, поточний закритий артефакт зберігається.

Формат handoff: `base SHA`, `changed files`, `tests + output`, `screenshots`, `claim approvals`, `unresolved decisions`, `verdict`. `NOT VERIFIED` відрізняти від `PASS`.
