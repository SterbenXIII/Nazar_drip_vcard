# B0 — заявка HAVENHUB до Telegram-бота (проєкт специфікації)

**Статус:** окремий дизайн на перегляд. Не активує форму й не змінює API. Мета: прийняти мінімальну заявку з landing без фіктивних полів і надійно передати її в захищений Telegram-чат.

## Контекст і межа

Замовник просить поля «ім'я», «номер телефону», «тип залежності». Нинішня `apps/clinic-web/src/components/Contact.astro` показує **лише телефон і Telegram, без форми**; `src/scripts/clinic-lead-form.ts` лишився у дереві як legacy-скрипт для неіснуючих елементів форми та використовує `@vcard/shared.leadSchema`, де обов'язкові `district` і масив `services`. API `apps/api/src/routes/lead.routes.ts` приймає цей legacy payload і повертає 201 після coordinator; чинні повідомлення провайдера можуть мати окрему failure semantics. Не переписувати старий `apps/web` контракт заради трьох полів HAVENHUB.

## Пропонований контракт

- Видима форма: ім'я (як звертатися), телефон, один тип залежності з трьох підтверджених напрямів. Додати короткий privacy notice та необхідний consent, коли погоджено текст/правову підставу; не додавати поле з довільним описом стану.
- Новий окремий clinic endpoint, наприклад `POST /api/clinic/leads`, і schema `ClinicLeadInput`: три видимі поля `name`, `phone`, `dependencyType`; `source: 'clinic-web'` встановлює сервер, а не довіряє браузеру; окремий одноразовий challenge token за затвердженим контрактом. Конкретний URL звірити з proxy й чинним API router до реалізації. Сервер повторно валідовує дозволений enum і довжини; незнайомі поля відхиляє або явно відкидає за задокументованим контрактом.
- Bot token і chat ID існують лише на сервері в захищеній конфігурації. Повідомлення містить мінімальні три поля та внутрішній ID/час, без IP, user agent, cookies чи довільного медичного тексту. Тільки уповноважений чат, без fallback на приватний акаунт.
- Рекомендована семантика: після перевірки зберегти заявку й задачу доставки атомарно, повернути `202 Accepted` із неприватним ID; окремий retry доставляє в Telegram з bounded attempts і статусом. Успіх UI: «Звернення отримано. Ми зв'яжемося з вами»; не стверджувати «доставлено в Telegram», поки це не підтверджено. Якщо durable queue не прийнята, альтернативний sync send має визначити failure, retry та idempotency до coding.
- Rate limiting, challenge, CSRF/CORS залежно від same-origin архітектури, timeout, idempotency/duplicate policy, redacted logs, retention/deletion і доступ до чату фіксуються в рішенні до відкриття форми. У відповіді API не повертати введені персональні дані.

## Failure semantics

| Умова | Очікування |
| --- | --- |
| Невалідний номер/тип, порожнє ім'я | Немає запису чи Telegram; помилка біля поля; фокус на першій помилці |
| Challenge не пройдено / rate limit | Немає доставки; нейтральне повідомлення без витоку технічних деталей |
| Збереження не відбулося | Не показувати success; дозволити повтор, не губити введений текст без потреби |
| Telegram тимчасово недоступний після прийняття | Черга/статус pending і retry; не стверджувати delivery success |
| Повторна заявка / retry браузера | Визначена і перевірена idempotency політика; не створювати кілька однакових бот-повідомлень через мережевий retry |
| Немає серверного секрету | Форма вимкнена у build/runtime або endpoint повертає unavailable; телефон і Telegram залишаються |

## Privacy і activation gate

До публікації погодити мету обробки, доступ до бот-чату, строк зберігання, спосіб видалення та текст notice. Не запускати на реальні номери під час тестів. У тестах temporary SQLite, fake provider, синтетичний телефон; жодного зовнішнього Telegram виклику. Відкриття форми потребує окремого feature flag, перевіреного end-to-end маршруту, чинного privacy text і рішення owner. Реліз landing без форми допустимий лише як окреме погоджене рішення; вимога замовника лишається у backlog B0.

## Питання для власника процесу

1. Куди саме надходить бот-повідомлення: груповий чат чи приватний чат, хто має доступ і хто чергує?
2. Який прийнятний строк відповіді та що робити з pending/failed доставкою?
3. Який строк зберігання заявки й хто видаляє її за запитом?
4. Чи можна телефонувати людині на вказаний номер за поданою заявкою, і який текст згоди погоджено?

Ці питання блокують активацію, але не перешкоджають розробці із синтетичними даними.

## Звірка з кодом станом на 10.10.2026 (Task 9)

Це **read-only contract reconciliation**. Ні endpoint, ні Telegram-доставка, ні збір/збереження персональних даних для B0 не реалізовані.

| Питання | Підтверджене в репозиторії | Висновок B0 |
| --- | --- | --- |
| Реальний існуючий HTTP endpoint | `apps/api/src/app.ts`, `constants/routes/api-routes.const.ts`: `POST /api/leads/submit` | **Не** розширювати legacy route фіктивними district/services; новий `POST /api/clinic/leads` є **проєктним**, ще не зареєстрованим |
| Legacy валідація | `packages/shared/src/schemas/lead/lead.schema.ts`: name, phone, district, services; `source` / `turnstileToken` optional | Окремий clinic `z.strictObject` із трьома видимими полями та серверно контрольованим source; регресійні тести legacy schema обов’язкові |
| Збереження й повідомлення | `lead.routes.ts`: 201 після `NotificationCoordinator.handleIncomingLead`; coordinator зберігає lead, синхронно пробує провайдерів та **логуватиме, але не повторюватиме після рестарту** невдалі доставки | Існуючий coordinator **не є durable outbox**. B0 потребує окремого атомарного запису lead + delivery job до 202; 202 означає `accepted`, не `delivered` |
| Telegram recipients | `notification.coordinator.ts`: `TELEGRAM_MASTER_ID`, `TELEGRAM_NOTIFY_IDS` плюс allowed chats | B0 не успадковує всі адресати. Лише затверджений спеціальний B0 chat ID, виключно серверна конфігурація |
| Telegram transport | `telegram-messaging.provider.ts` формує `sendMessage`, використовує HTML parse mode, може включати текст від Telegram API у лог помилки | Приватні поля HTML-екранувати; не логувати токен/тіло відповіді провайдера/ПІБ/телефон; фальшивий provider для тестів |
| SQLite | `DatabaseService.initializeOnStartup` виконує тільки `001_initial_leads_table`; наявна схема має district/services та не має outbox/idempotency | Додати окрему міграцію clinic lead + outbox з `UNIQUE` за idempotency-key (без зберігання відкритого ключа), зареєструвати її в startup; перевірити транзакційність і поведінку після restart |
| Проксі та CORS | Публічний `ops/docker/caddy/Caddyfile` маршрутизує `/api/*` до API; локальний `apps/clinic-web/nginx.conf` **відхиляє** `/api/*` як 404; API CORS при порожньому `DOMAIN_NAME` є wildcard | Затвердити кінцевий HTTPS host і окремий proxy path до доступності B0. Не активувати форму на поточному static Nginx без робочого HTTPS API; scope CORS обмежити exact allowed clinic origin |
| Rate limit і challenge | `app.ts` прив’язує in-memory IP limiter лише до `/api/leads/submit`; Turnstile є умовним у legacy route, якщо існує `TURNSTILE_SECRET_KEY` | Новий endpoint потребує власного rate limit, довіреної client-IP межі й чіткого fail-closed challenge contract. Не покладатись на legacy limiter |
| Поточний UI | `Contact.astro` **не має форми**, тести `e2e/lead-form.spec.ts` стверджують її відсутність; `clinic-lead-form.ts` є застарілим файлом, не активним інтерфейсом | У B0 UI слід створити нову форму лише під окремим gate та переписати/видалити legacy DOM script після перевірки імпортів. Поточні телефон і Telegram не змінювати |

### Порядок подій / гарантії

1. Сервер приймає тільки мінімальні `name`, `phone`, `dependencyType`; `source` призначає **сам сервер** (не довіряти довільному значенню від браузера). Consent/challenge фіксувати з погодженим purpose/version без зайвого медичного опису.
2. Після перевірки challenge, лімітів, правового notice та idempotency ключа одна транзакція вставляє lead і outbox job; лише після commit можна відповідати `202 { accepted: true, id: opaqueId }`. Відмова транзакції не відповідає успіхом.
3. Worker із безпечною конкуренцією / lease claim доставляє в **один** затверджений чат. Успішний `sendMessage` окремо фіксує статус. Retry має bounded exponential backoff, dead-letter/failed стан і alert оператору; на рестарті незавершені jobs відновлюються.
4. **Не обіцяти математичного exactly-once доставки Telegram.** Якщо Telegram прийняв повідомлення, але процес упав до DB acknowledgement, зовнішній повтор потенційно можливий. Узгодити deduplication/операторську обробку, ідентифікатор заявки в повідомленні та тест на такий збій до production.
5. Форма не повинна розкривати в API відповіді ім’я, телефон, chat ID або токен. Логи й телеметрія повинні бути очищені від медичних та контактних даних; захищений audit і видалення за retention мають окрему політику.

### Незакриті рішення власника

- Однозначний **реальний домен і proxy** для clinic API, де буде реальний server-side endpoint.
- Уповноважений **один Telegram chat** і список персоналу з доступом, маршрут ескалації невдалих повідомлень.
- Затверджений текст і правова підстава обробки **контактних і потенційно чутливих даних** (включно з типом залежності), конкретний строк retention, хто видаляє й як людина відкликає згоду.
- Правила відповіді на заявку: строк, час роботи, хто телефонує; idempotency TTL, challenge і спосіб rate limiting.
- Дозвіл на окрему реалізацію backend/API та захищений тестовий чат із **суто синтетичними даними**; відсутність секретів у репозиторії.

**Release gate B0: BLOCKED**, поки власник не підтвердить ці пункти та поки frontend+API+outbox не пройдуть спільні acceptance/rollback перевірки. Ця звірка не змінює старий API або режим нормальної збірки.
