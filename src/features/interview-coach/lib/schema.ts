import { z } from 'zod';

import {
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_MODES,
  INTERVIEW_TOPICS,
} from '@/types/interview';

import { JS_SUBTOPIC_KEYS } from './subtopics';

/** Максимум вопросов в тренировке (сервер дополнительно ограничивает своим env). */
export const MAX_QUESTIONS = 10;
export const MIN_QUESTIONS = 3;

/** Доступные длины теста: только эти два варианта показывает UI. */
export const TEST_QUESTION_COUNTS = [5, 10] as const;
export type TestQuestionCount = (typeof TEST_QUESTION_COUNTS)[number];

export const interviewSetupSchema = z.object({
  mode: z.enum(INTERVIEW_MODES),
  topic: z.enum(INTERVIEW_TOPICS),
  difficulty: z.enum(INTERVIEW_DIFFICULTIES),
  language: z.enum(INTERVIEW_LANGUAGES),
  questionCount: z
    .number()
    .int()
    .min(MIN_QUESTIONS, `Минимум ${MIN_QUESTIONS} вопроса`)
    .max(MAX_QUESTIONS, `Максимум ${MAX_QUESTIONS} вопросов`),
  applicationId: z.string(),
});

export type InterviewSetupValues = z.infer<typeof interviewSetupSchema>;

export const DEFAULT_SETUP_VALUES: InterviewSetupValues = {
  mode: 'text',
  topic: 'javascript',
  difficulty: 'junior',
  language: 'ru',
  questionCount: 5,
  applicationId: '',
};

/**
 * Настройки тестового режима: минимум одна подтема из allowlist,
 * длина теста — 5 или 10 вопросов.
 */
export const testSetupSchema = interviewSetupSchema.extend({
  subtopics: z
    .array(z.enum(JS_SUBTOPIC_KEYS))
    .min(1, 'Выберите хотя бы одну тему')
    .max(JS_SUBTOPIC_KEYS.length, 'Слишком много тем')
    .refine(
      (subtopics) => new Set(subtopics).size === subtopics.length,
      'Темы не должны повторяться',
    ),
  questionCount: z.union([z.literal(TEST_QUESTION_COUNTS[0]), z.literal(TEST_QUESTION_COUNTS[1])]),
});

export type TestSetupValues = z.infer<typeof testSetupSchema>;
