import { z } from 'zod';

/**
 * Строгие контракты ответов Edge Functions. Всё, что приходит от AI,
 * проходит через эти схемы — некорректная структура не ломает интерфейс.
 */

const scoreValue = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const criterionScoreSchema = z.union([
  z.object({ score: scoreValue, comment: z.string() }),
  z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
]);

export const evaluationResponseSchema = z.object({
  scores: z.object({
    correctness: criterionScoreSchema,
    completeness: criterionScoreSchema,
    understanding: criterionScoreSchema,
    practical_application: criterionScoreSchema,
    explanation_quality: criterionScoreSchema,
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  model_answer: z.string(),
  follow_up_question: z.string().nullable(),
});

export const questionsResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        subtopic: z.string().nullable(),
      }),
    )
    .min(1),
});

export const hintResponseSchema = z.object({
  hint: z.string().min(1),
});

export const reportResponseSchema = z.object({
  summary: z.string(),
  total_questions: z.number().int().nonnegative(),
  answered_questions: z.number().int().nonnegative(),
  skipped_questions: z.number().int().nonnegative(),
  strengths: z.array(z.string()),
  weak_topics: z.array(z.string()),
  weak_answers: z.array(z.object({ question: z.string(), issue: z.string() })),
  topics_to_review: z.array(z.string()),
  recommendations: z.array(z.string()),
  conclusion: z.string(),
});

export const analysisResponseSchema = z.object({
  summary: z.string(),
  matched_skills: z.array(z.object({ name: z.string(), comment: z.string() })),
  unconfirmed_requirements: z.array(z.object({ requirement: z.string(), note: z.string() })),
  needs_verification: z.array(z.object({ requirement: z.string(), note: z.string() })),
  preparation_recommendations: z.array(z.string()),
  possible_interview_questions: z.array(z.string()),
});

export const realtimeSessionResponseSchema = z.object({
  token: z.string().min(1),
  model: z.string().min(1),
  // Gemini не всегда возвращает срок жизни токена — поле может отсутствовать или быть null.
  expires_at: z.number().nullable().optional(),
});

export const coverLetterResponseSchema = z.object({
  cover_letter: z.string().min(1),
});

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function parseAiResponse<T>(schema: z.ZodType<T>, raw: unknown): ParseResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    message:
      'AI-сервис вернул ответ в неожиданном формате. Повторите запрос — если проблема сохраняется, попробуйте позже.',
  };
}
