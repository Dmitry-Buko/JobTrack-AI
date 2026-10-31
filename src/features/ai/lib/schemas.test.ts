import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { evaluationResponseSchema, parseAiResponse, questionsResponseSchema } from './schemas';

describe('parseAiResponse', () => {
  const schema = z.object({ value: z.number() });

  it('пропускает валидные данные', () => {
    const result = parseAiResponse(schema, { value: 42 });
    expect(result.ok).toBe(true);
  });

  it('возвращает понятную ошибку для мусора', () => {
    const result = parseAiResponse(schema, { value: 'не число' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('неожиданном формате');
    }
  });
});

describe('questionsResponseSchema', () => {
  it('требует непустой список вопросов с подтемой или null', () => {
    expect(
      questionsResponseSchema.safeParse({
        questions: [{ question: 'Что такое замыкание?', subtopic: 'functions_closures' }],
      }).success,
    ).toBe(true);
    expect(
      questionsResponseSchema.safeParse({
        questions: [{ question: 'Что такое замыкание?', subtopic: null }],
      }).success,
    ).toBe(true);
    expect(questionsResponseSchema.safeParse({ questions: [] }).success).toBe(false);
    expect(
      questionsResponseSchema.safeParse({ questions: [{ question: '', subtopic: null }] }).success,
    ).toBe(false);
  });
});

describe('evaluationResponseSchema', () => {
  const validEvaluation = {
    scores: {
      correctness: { score: 4, comment: 'верно' },
      completeness: { status: 'insufficient_data', comment: 'коротко' },
      understanding: { score: 5, comment: '' },
      practical_application: { score: 5, comment: '' },
      explanation_quality: { score: 3, comment: '' },
    },
    strengths: ['точные определения'],
    gaps: ['мало примеров'],
    model_answer: '...',
    follow_up_question: null,
  };

  it('принимает смешанные оценки 1–5 и insufficient_data', () => {
    expect(evaluationResponseSchema.safeParse(validEvaluation).success).toBe(true);
  });

  it('отклоняет оценку вне диапазона', () => {
    const invalid = {
      ...validEvaluation,
      scores: { ...validEvaluation.scores, correctness: { score: 9, comment: '' } },
    };
    expect(evaluationResponseSchema.safeParse(invalid).success).toBe(false);
  });
});
