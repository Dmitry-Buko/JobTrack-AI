-- Тестовый режим текстового тренажёра: формат сессии, выбранные подтемы,
-- тема и признак подсказки у вопросов. Только nullable-добавления,
-- без разрушающих изменений; RLS-политики таблиц действуют как раньше.

alter table public.interview_sessions
  add column format text check (format in ('chat', 'test')),
  add column selected_topics jsonb;

comment on column public.interview_sessions.format is
  'Формат сессии: chat — старый диалоговый режим, test — тест с одним вопросом на экране. NULL у сессий, созданных до миграции.';

comment on column public.interview_sessions.selected_topics is
  'Выбранные подтемы теста: jsonb-массив ключей из allowlist (см. src/features/interview-coach/lib/subtopics.ts и functions/shared/subtopics.ts).';

alter table public.interview_messages
  add column subtopic text,
  add column hint_used boolean not null default false;

comment on column public.interview_messages.subtopic is
  'Подтема вопроса: ключ из allowlist. NULL у сообщений старых сессий и ответов пользователя.';

comment on column public.interview_messages.hint_used is
  'Использовалась ли подсказка при ответе на этот вопрос.';
