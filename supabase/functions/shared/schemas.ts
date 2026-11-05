/**
 * Серверный источник правды для enum-списков Edge Functions.
 *
 * Список тем синхронизирован вручную с двумя местами:
 *  - SQL-check в supabase/migrations/0003_interviews.sql
 *    (constraint interview_sessions_topic_check, комментарий — миграция 0008);
 *  - клиентская константа INTERVIEW_TOPICS в src/types/interview.ts.
 */
import { z } from 'zod';

export const INTERVIEW_TOPICS = [
  'javascript',
  'typescript',
  'react',
  'redux_toolkit',
  'html_css',
  'browser_apis',
  'networking',
  'mixed',
] as const;

export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

export const topicEnum = z.enum(INTERVIEW_TOPICS);
