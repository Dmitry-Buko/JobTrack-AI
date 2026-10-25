# JobTrack AI — реализация с нуля (полный объём ТЗ)

## Исходные решения
- Supabase-проекта и OpenAI-ключа пока нет → весь production-код пишем под реальный API без фиктивных ответов; реквизиты подключаются позже через `.env` и секреты Supabase. В README — пошаговое подключение (создание проекта, миграции, деплой функций, секреты). E2E-проверка с реальным бэкендом — сразу после появления реквизитов.
- Если интернета не будет на старте выполнения: пишем все файлы код-первым, `npm install` и прогон проверок выполняем при появлении сети.
- UI на русском языке. Проект создаётся в корне `D:\Redev\JobTrack AI` + git init.

## 1. Каркас
- Vite + React + TypeScript strict (без `any`, `unknown` + zod для внешних данных), ESLint.
- Зависимости: react-router v7 (library mode), Redux Toolkit + RTK Query, Tailwind CSS v4 (@tailwindcss/vite), React Hook Form + zod + resolvers, lucide-react, @supabase/supabase-js v2, @dnd-kit/core + sortable, Vitest + @testing-library/react + jsdom.
- Скрипты: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `check` (= typecheck + lint + test + build).
- `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (парсер env через zod с понятной ошибкой).
- Дизайн-система: семантические токены Tailwind (surface/border/text/accent/status-*), светлая и тёмная темы через класс на `<html>` + переключатель с сохранением, единые отступы/радиусы/типографика. Спокойный SaaS-стиль без градиентов и лишних теней.

## 2. Структура
```
src/
  app/                    # store, typed hooks
  components/ui/          # Button, Input, Textarea, Select, Badge, Card, Modal,
                          # ConfirmDialog, EmptyState, ErrorState, Skeleton, Toast
  components/layout/      # AppLayout (сайдбар ≥1024px, компактное меню на мобильных), AuthLayout
  features/auth/          # Login, Register, ForgotPassword, ProtectedRoute, восстановление сессии
  features/dashboard/     # метрики, события, рекомендации
  features/applications/  # список + Kanban, форма (RHF+Zod), детальная, фильтры/поиск/сортировка
  features/profile/       # профиль + навыки (10 стартовых технологий)
  features/interview-coach/ # настройки тренировки, текстовая сессия, голосовая сессия
  features/history/       # список тренировок + детальный просмотр
  features/ai/            # zod-валидаторы ответов AI, маппинг в UI-типы
  lib/                    # supabase-клиент, env, utils, форматирование
  services/realtime/      # useRealtimeSession — WebRTC-хук с полным жизненным циклом
  types/                  # application.ts, interview.ts, profile.ts, database.ts
supabase/
  migrations/             # 0001–0004
  functions/              # 5 AI-функций + shared/
```

## 3. База данных (миграции + RLS)
- `profiles` (id→auth.users, full_name, target_role, experience_level, experience_summary, timestamps) — триггер автосоздания при регистрации.
- `profile_skills` (name, self_assessed_level 1–5 или уровень, notes, timestamps).
- `applications`: company, position, url, description, location, work_format (office/remote/hybrid), salary_min/max, status (7 статусов ТЗ), priority, applied_at, next_action_at, notes, timestamps. Индексы user_id/status/created_at.
- `interview_sessions`: application_id (nullable FK), mode (text/voice), topic, difficulty (junior/junior_plus/middle), language (ru/en), status (active/completed/aborted), started_at, completed_at, summary text, `report jsonb` (строго типизированная структура отчёта).
- `interview_messages`: session_id, role (assistant/user/system), content, turn_index, `evaluation jsonb` (документированный формат: критерии 1–5 | «Недостаточно данных», пояснения, пример полного ответа, уточняющий вопрос), created_at.
- `application_analyses`: application_id, user_id, result jsonb, created_at — история AI-анализов вакансии с датой.
- `ai_usage`: user_id, function_name, created_at — для rate limiting AI-запросов.
- RLS на всех таблицах: владелец-only; доступ к messages — через принадлежность сессии, к analyses — через вакансию. Триггеры `updated_at`. Enum-поля через CHECK/Postgres enum.

## 4. Edge Functions (Deno) + AI-архитектура
`shared/`: cors, проверка JWT пользователя (supabase.auth.getUser), клиент OpenAI, централизованная конфигурация моделей только через env функций (`OPENAI_TEXT_MODEL`, `OPENAI_REALTIME_MODEL`, `MAX_QUESTIONS` — без хардкода в коде), rate-limit по `ai_usage`, лимиты длины входных данных, zod-валидация ответов AI.

- `interview-questions` — генерация N вопросов (тема/уровень/язык/контекст вакансии; смешанная тема — без перекоса в одну); вопросы на понимание, сценарии, «что выведет код», поиск ошибок.
- `evaluate-answer` — анализ ответа: корректность, полнота, понимание сути, практическое применение, качество объяснения (каждое 1–5 или «Недостаточно данных» + пояснение), пример полного ответа, опциональный уточняющий вопрос. Правильный ответ не возвращается до ответа пользователя (кроме явной подсказки).
- `session-report` — итоговый отчёт: количество вопросов, сильные стороны, пробелы, примеры неточных ответов, темы для повторения, рекомендации.
- `analyze-job` — сопоставление описания вакансии с профилем навыков: совпадения, «не указано в профиле»/«необходимо проверить» (без утверждений о неспособности), рекомендации, возможные вопросы интервью.
- `realtime-session` — POST к OpenAI `/v1/realtime/sessions` → краткосрочный ephemeral token клиенту. Постоянный ключ только в секретах Supabase. (Актуальные параметры API сверю с документацией OpenAI на момент реализации.)

## 5. Стадии реализации (после каждой — прогон проверок)
1. **Каркас + тема + UI-кит + layout** (п.1–2).
2. **Схема БД + типы + RTK Query**: applicationsApi, profileApi, sessionsApi, aiApi (вызовы функций с JWT пользователя), система тегов для инвалидации кэша.
3. **Авторизация**: страницы входа/регистрации/восстановления, ProtectedRoute, сохранение сессии после перезагрузки, ошибки на русском.
4. **Вакансии**: список + Kanban (смена статуса через меню — dnd отдельной стадией), поиск по компании/должности, фильтры статус/приоритет, сортировка, форма создания/редактирования (RHF+Zod), детальная /applications/:id, удаление с подтверждением; связанные тренировки на детальной не удаляются.
5. **Профиль + навыки**: редактирование, уровень владения как самооценка.
6. **Текстовый режим Interview Coach**: страница настроек (формат/тема/сложность/кол-во вопросов ≤ MAX_QUESTIONS/язык/вакансия), создание записи сессии в БД, пошаговый Q&A, оценка после каждого ответа, подсказка, пропуск, досрочное завершение + промежуточный результат, итоговый отчёт, автосохранение реплик.
7. **AI-анализ вакансии** на детальной странице + история анализов.
8. **Голосовой режим**: хук useRealtimeSession (WebRTC: SDP offer/answer, ephemeral token, микрофон только после действия пользователя, mute, отключение/восстановление, освобождение ресурсов, обработка отказа в микрофоне/истечения токена/обрыва), экран сессии (тема, текущий вопрос, индикатор речи, состояния «Подключение/Слушаю/ИИ отвечает/Ошибка», транскрипт, кнопки mute/завершить/повторить), дисклеймер об обработке аудио внешним сервисом, сохранение транскрипта + отчёт, предложение текстового режима при недоступности. Автоперезапуск соединения после перезагрузки страницы не выполняем.
9. **История**: список тренировок (дата/формат/тема/уровень/язык/вопросы/результат/вакансия), фильтры тема/формат/дата, детальный просмотр диалога и отчёта; данные переживают перезагрузку и выход.
10. **Dashboard**: все метрики из реальных данных (всего/отклики/предстоящие собеседования/офферы), последние действия, ближайшие события, последние тренировки, слабые темы и рекомендации, полезные пустые состояния.
11. **Drag-and-drop (dnd-kit)** на Kanban поверх меню статусов.
12. **Тесты + полировка**: unit-тесты (zod-схемы, расчёт статистики дашборда, парсеры ответов AI с безопасным фолбэком, метаданные статусов), компонентные (карточка вакансии, бейджи статусов, валидация форм, EmptyState); адаптив 1440/1024/768/375 без горизонтальной прокрутки страницы; a11y (семантика, label, фокус, клавиатура); README с инструкцией подключения Supabase/OpenAI и деплоя.

## Верификация
- После каждой стадии: `npm run check` (tsc + eslint + vitest + build) — зелёный прогон обязателен.
- Ручная проверка UI через dev-сервер (маршруты, состояния загрузки/ошибки/пустые, темы, адаптив).
- E2E с реальными Supabase/OpenAI — чек-листом в README, прогоним сразу после появления реквизитов.