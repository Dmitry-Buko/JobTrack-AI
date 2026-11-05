-- Документируем источник правды списка тем собеседований: один и тот же
-- перечень живёт в Edge Functions (shared/schemas.ts, INTERVIEW_TOPICS)
-- и в клиенте (src/types/interview.ts, INTERVIEW_TOPICS). SQL-check в 0003
-- редактировать нельзя, поэтому связь фиксируем комментарием на констрейнте.

comment on constraint interview_sessions_topic_check on public.interview_sessions is
  'Список тем (topic in (...)). Источник правды: supabase/functions/shared/schemas.ts (INTERVIEW_TOPICS); клиентская копия: src/types/interview.ts.';
