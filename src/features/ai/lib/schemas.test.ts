import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  evaluationResponseSchema,
  marketSearchResponseSchema,
  parseAiResponse,
  questionsResponseSchema,
} from './schemas';

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

describe('marketSearchResponseSchema', () => {
  const vacancy = {
    id: 'remoteok:1',
    source: 'remoteok',
    url: 'https://remoteok.com/remote-jobs/1',
    company: 'Acme',
    position: 'Frontend Developer',
    location: 'Remote',
    salary: '$60k–$90k',
    description: 'React и TypeScript',
    publishedAt: '2026-11-02T10:00:00.000Z',
    match: { percent: 82, matched: ['React'], missing: ['GraphQL'], summary: 'Хорошее совпадение' },
  };
  const meta = { fetched: { remoteok: 1 }, errors: [], total: 1, aiUsed: true };

  it('принимает вакансию с матчингом и без', () => {
    expect(marketSearchResponseSchema.safeParse({ vacancies: [vacancy], meta }).success).toBe(true);
    expect(
      marketSearchResponseSchema.safeParse({ vacancies: [{ ...vacancy, match: null }], meta })
        .success,
    ).toBe(true);
  });

  it('принимает ответ с ошибкой AI (match: null, aiError задан)', () => {
    const result = marketSearchResponseSchema.safeParse({
      vacancies: [{ ...vacancy, match: null }],
      meta: { ...meta, aiUsed: false, aiError: 'Модель перегружена' },
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет вакансию без обязательных полей', () => {
    const { url: _url, ...withoutUrl } = vacancy;
    expect(
      marketSearchResponseSchema.safeParse({
        vacancies: [{ ...withoutUrl, match: null }],
        meta,
      }).success,
    ).toBe(false);
  });
});
