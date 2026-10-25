import { z } from 'zod';

import {
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_MODES,
  INTERVIEW_TOPICS,
} from '@/types/interview';

/** Максимум вопросов в тренировке (сервер дополнительно ограничивает своим env). */
export const MAX_QUESTIONS = 10;
export const MIN_QUESTIONS = 3;

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
