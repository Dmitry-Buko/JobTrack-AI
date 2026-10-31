# JobTrack AI

Веб-приложение для управления поиском работы и подготовки к техническим собеседованиям с помощью ИИ: вакансии и Kanban-доска, AI-интервьюер в текстовом и голосовом режимах, анализ требований вакансий и история тренировок с отчётами.

## Возможности

- **Авторизация** — регистрация, вход, восстановление пароля, защищённые маршруты, сохранение сессии (Supabase Auth).
- **Вакансии** — CRUD, 7 статусов, Kanban-доска с drag-and-drop и меню смены статуса, поиск, фильтры, сортировка.
- **AI Interview Coach** — текстовый режим с оценкой ответов по 5 критериям (1–5 или «Недостаточно данных»), подсказки, пропуск вопросов, промежуточный и итоговый отчёты; голосовой режим на Gemini Live API (WebSocket) с транскрипцией диалога и перебиванием ИИ.
- **AI-анализ вакансии** — сопоставление описания вакансии с профилем навыков, история анализов.
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

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (регион — любой).
2. **Переменные фронтенда.** Скопируйте Project URL и anon key (Settings → API) в `.env`:
   ```
   VITE_SUPABASE_URL=https://<ваш-проект>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   Это публичные значения для браузера; данные защищает RLS, а не секретность ключа.
3. **Схема БД.** Примените миграции из `supabase/migrations/` по порядку:
   - через Supabase CLI: `supabase link --project-ref <ref>` затем `supabase db push`;
   - или откройте SQL Editor в панели Supabase и выполните содержимое файлов `0001…0004` по очереди.
4. **Включите email-авторизацию** (Authentication → Providers → Email). Для быстрой разработки можно отключить подтверждение email (Authentication → Providers → Email → Confirm email).

## Настройка AI (Google Gemini)

1. Создайте бесплатный API-ключ в [Google AI Studio](https://aistudio.google.com) («Get API key»). Бесплатного тарифа хватает для демонстрации; лимиты динамические и видны в AI Studio.
2. Положите ключ в секреты Supabase (ключ **никогда** не попадает во фронтенд):
   ```bash
   supabase secrets set GEMINI_API_KEY=AIza...
   ```
3. Задеплойте Edge Functions:
   ```bash
   supabase functions deploy interview-questions
   supabase functions deploy evaluate-answer
   supabase functions deploy session-report
   supabase functions deploy analyze-job
   supabase functions deploy realtime-session
   ```
   Необходима версия CLI ≥ 1.160 (runtime Deno). Функции уже проверяют JWT пользователя — дополнительная настройка аутентификации не нужна.

Модели и лимиты настраиваются переменными окружения функций (не хардкодятся в коде):

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `GEMINI_TEXT_MODEL` | `gemini-3.8-flash` | текстовая генерация/оценка/отчёты |
| `GEMINI_LIVE_MODEL` | `gemini-3.8-live` | голосовые сессии (Live API) |
| `MAX_QUESTIONS` | `10` | потолок вопросов в тренировке |
| `AI_RATE_LIMIT_PER_HOUR` | `60` | лимит AI-запросов на пользователя в час |

## Безопасность

- Постоянный ключ Gemini хранится только в секретах Supabase; клиенту голосовой режим выдаёт краткосрочный ephemeral-токен (`realtime-session`), а инструкции интервьюера фиксируются на сервере в `liveConnectConstraints`.
- RLS включён на всех пользовательских таблицах; доступ к сообщениям — через принадлежность сессии, к анализам — через вакансию.
- Edge Functions проверяют JWT пользователя; AI-запросы рейт-лимитятся таблицей `ai_usage`.
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
  migrations/   # схема PostgreSQL + RLS
  functions/    # Edge Functions (Deno): 5 AI-функций + shared
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
