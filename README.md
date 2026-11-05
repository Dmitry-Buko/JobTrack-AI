# JobTrack AI

[![CI](https://github.com/Dmitry-Buko/JobTrack-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Dmitry-Buko/JobTrack-AI/actions/workflows/ci.yml)

Веб-приложение для управления поиском работы и подготовки к техническим собеседованиям с помощью ИИ: вакансии и Kanban-доска, AI-интервьюер в текстовом и голосовом режимах, поиск вакансий с AI-матчингом, анализ требований вакансий и история тренировок с отчётами.

## Возможности

- **Авторизация** — регистрация, вход, восстановление пароля, защищённые маршруты, сохранение сессии (Supabase Auth).
- **Вакансии** — CRUD, 7 статусов, Kanban-доска с drag-and-drop и меню смены статуса, поиск, фильтры, сортировка.
- **AI Interview Coach** — текстовый режим с оценкой ответов по 5 критериям (1–5 или «Недостаточно данных»), подсказки, пропуск вопросов, промежуточный и итоговый отчёты; голосовой режим на Gemini Live API (WebSocket) с транскрипцией диалога и перебиванием ИИ.
- **AI-поиск вакансий** — агрегатор Telegram/RemoteOK/WeWorkRemotely с гео-фильтром по Беларуси и AI-матчингом под профиль (процент совпадения, недостающие навыки).
- **AI-анализ вакансии** — сопоставление описания вакансии с профилем навыков, история анализов.
- **Сопроводительные письма** — генерация письма под вакансию и профиль кандидата.
- **Профиль навыков** — самооценка уровней, используется для персонализации.
- **История тренировок** — фильтры по теме/формату/дате, детальный просмотр диалога и отчёта.
- **Дашборд** — метрики поиска работы, ближайшие события, слабые темы.

## Стек

React 19 + TypeScript (strict) + Vite · React Router · Redux Toolkit + RTK Query · Tailwind CSS v4 · React Hook Form + Zod · Lucide · dnd-kit · Vitest + React Testing Library · Supabase (Auth, PostgreSQL, RLS, Edge Functions) · Google Gemini (generateContent + Live API через WebSocket).

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполните ключи Supabase (см. ниже)
npm run dev
```

Скрипты:

| Команда | Действие |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm run build` | production-сборка (`tsc -b` + Vite) |
| `npm run typecheck` | проверка типов |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (однократно) |
| `npm run check` | typecheck + lint + test + build |
| `npm run check:functions` | Edge Functions: `deno check` + `deno lint` + `deno test` (нужен установленный [Deno](https://deno.com) 2.x) |

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (регион — любой).
2. **Переменные фронтенда.** Скопируйте Project URL и anon key (Settings → API) в `.env`:
   ```
   VITE_SUPABASE_URL=https://<ваш-проект>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   Это публичные значения для браузера; данные защищает RLS, а не секретность ключа.
3. **Схема БД.** Примените миграции из `supabase/migrations/` по порядку (`0001` … `0008`):
   - предпочтительно через Supabase CLI: `supabase link --project-ref <ref>`, затем `supabase db push`;
   - или откройте SQL Editor в панели Supabase и выполните содержимое файлов `0001`–`0008` по очереди.
4. **Включите email-авторизацию** (Authentication → Providers → Email). Для быстрой разработки можно отключить подтверждение email (Authentication → Providers → Email → Confirm email).

## Настройка AI (Google Gemini)

1. Создайте бесплатный API-ключ в [Google AI Studio](https://aistudio.google.com) («Get API key»). Бесплатного тарифа хватает для демонстрации; лимиты динамические и видны в AI Studio.
2. Положите ключ в секреты Supabase (ключ **никогда** не попадает во фронтенд):
   ```bash
   supabase secrets set GEMINI_API_KEY=AIza...
   ```
3. Задеплойте все Edge Functions:
   ```bash
   supabase functions deploy interview-questions
   supabase functions deploy evaluate-answer
   supabase functions deploy session-report
   supabase functions deploy analyze-job
   supabase functions deploy realtime-session
   supabase functions deploy generate-cover-letter
   supabase functions deploy market-search
   ```
   Необходима версия CLI ≥ 1.160 (runtime Deno). Функции уже проверяют JWT пользователя — дополнительная настройка аутентификации не нужна. Проверить функции локально можно командой `npm run check:functions` (deno check + lint + test).

Модели и лимиты настраиваются переменными окружения функций (не хардкодятся в коде):

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `GEMINI_TEXT_MODEL` | `gemini-3.8-flash` | текстовая генерация/оценка/отчёты |
| `GEMINI_LIVE_MODEL` | `gemini-3.8-live` | голосовые сессии (Live API) |
| `MAX_QUESTIONS` | `10` | потолок вопросов в тренировке |
| `AI_RATE_LIMIT_PER_HOUR` | `60` | лимит AI-запросов на пользователя в час **для каждой функции отдельно** |

Модели по умолчанию (`gemini-3.8-flash`, `gemini-3.8-live`) проверены по актуальной документации [Gemini API](https://ai.google.dev/gemini-api/docs/models).

## Сборка и деплой (Netlify)

Сборка настраивается в `netlify.toml` (`npm run build` → `dist`). Переменные окружения задаются в Netlify UI (Site settings → Environment):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — доступ к Supabase;
- `VITE_SITE_URL` — публичный адрес сайта (`https://…`): подставляется в `og:image` при сборке вместо плейсхолдера `YOUR-NETLIFY-DOMAIN`. Без переменной в мета-теге останется плейсхолдер — задайте её после привязки домена.

Заголовки безопасности (CSP, X-Frame-Options, Permissions-Policy и др.) применяются автоматически из `netlify.toml`.

## Безопасность

- Постоянный ключ Gemini хранится только в секретах Supabase; клиенту голосовой режим выдаёт краткосрочный ephemeral-токен (`realtime-session`), а инструкции интервьюера и параметры модели запекаются в токен на сервере (поле `bidiGenerateContentSetup`).
- RLS включён на всех пользовательских таблицах; доступ к сообщениям — через принадлежность сессии, к анализам — через вакансию.
- Edge Functions проверяют JWT пользователя; AI-запросы рейт-лимитятся атомарной RPC `consume_ai_quota` (миграция `0006`): подсчёт и вставка записи `ai_usage` в одной транзакции под advisory-локом, поэтому параллельные запросы не обходят лимит. Лимит применяется **к каждой функции отдельно** (по умолчанию 60/час, настраивается `AI_RATE_LIMIT_PER_HOUR`). Если RPC недоступна, функция отвечает 503 — лимит не отключается (fail-closed).
- Записи `ai_usage` старше 24 часов удаляет `public.cleanup_ai_usage()`: ежедневно в 03:17 UTC через `pg_cron` (если расширение доступно в проекте), либо вручную — `select public.cleanup_ai_usage();` в SQL Editor.
- Ссылка вакансии проверяется дважды: на клиенте `safeExternalUrl` (`src/lib/utils.ts`) пускает в `<a href>` только абсолютные http(s)-адреса, а миграция `0007` добавляет в БД `check (url is null or url ~* '^https?://')`. Ограничение создано `not valid`, чтобы не упасть на старых записях: найдите их запросом `select id, url from applications where url is not null and url !~* '^https?://';`, почистите и выполните `alter table public.applications validate constraint applications_url_http_check;`.
- Микрофон запрашивается только после действия пользователя; сырые аудиозаписи не сохраняются — только текстовая расшифровка.

## Структура проекта

```
src/
  app/          # store, хуки, маршруты
  components/   # UI-кит, layout, тема
  features/     # auth, applications, profile, interview-coach, history, dashboard, ai
  lib/          # env, supabase-клиент, утилиты, ошибки
  services/     # голосовой режим (Gemini Live, WebSocket)
  types/        # доменные типы (application, interview, profile, job-analysis)
supabase/
  migrations/   # схема PostgreSQL + RLS (0001–0008)
  functions/    # Edge Functions (Deno): 6 AI-функций + market-search + shared
```

Форматы jsonb-полей (`interview_sessions.report`, `interview_messages.evaluation`, `application_analyses.result`) описаны в `src/types` и валидируются zod-схемами в `src/features/ai/lib/schemas.ts` — некорректный ответ AI не ломает интерфейс.

## Чек-лист проверки после подключения

1. Регистрация → письмо (если включено подтверждение) → вход → дашборд с пустым состоянием.
2. Создание вакансии → смена статуса через меню и перетаскиванием на доске → редактирование → удаление с подтверждением.
3. Профиль: сохранение, добавление навыков, уровни.
4. Текстовая тренировка: генерация вопросов → ответ → оценка по критериям → подсказка → пропуск → досрочное завершение → отчёт.
5. AI-анализ вакансии с описанием → история анализов.
6. Голосовая тренировка: разрешение микрофона → диалог → mute → завершение → расшифровка и отчёт в истории; при отказе микрофона — понятная ошибка и переход в текстовый режим.
7. Перезагрузка страницы: сессия и история на месте; голосовое соединение не возобновляется автоматически.

## Примечания

- Приложение работает только с реальным бэкендом — фиктивных AI-ответов в production-коде нет.
- Уровни Junior/Junior+/Middle задают сложность вопросов, а не оценивают реальный профессиональный уровень; оценки AI — учебная обратная связь, не экзаменационный результат.
