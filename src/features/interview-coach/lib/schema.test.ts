import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETUP_VALUES,
  MAX_QUESTIONS,
  interviewSetupSchema,
  testSetupSchema,
} from './schema';
import { JS_SUBTOPIC_KEYS } from './subtopics';

describe('interviewSetupSchema', () => {
  it('принимает значения по умолчанию', () => {
    expect(interviewSetupSchema.safeParse(DEFAULT_SETUP_VALUES).success).toBe(true);
  });

  it('ограничивает количество вопросов сверху', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      questionCount: MAX_QUESTIONS + 1,
    });
    expect(result.success).toBe(false);
  });

  it('ограничивает количество вопросов снизу', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      questionCount: 1,
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет неизвестную тему', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      topic: 'python',
    });
    expect(result.success).toBe(false);
  });
});

describe('testSetupSchema — выбор тем для теста', () => {
  const base = { ...DEFAULT_SETUP_VALUES, mode: 'text' as const, questionCount: 5 as 5 | 10 };

  it('принимает валидный набор тем', () => {
    const result = testSetupSchema.safeParse({
      ...base,
      subtopics: ['arrays_methods', 'functions_closures'],
    });
    expect(result.success).toBe(true);
  });

  it('требует хотя бы одну тему', () => {
    const result = testSetupSchema.safeParse({ ...base, subtopics: [] });
    expect(result.success).toBe(false);
  });

  it('отклоняет неизвестный ключ темы (allowlist)', () => {
    const result = testSetupSchema.safeParse({
      ...base,
      subtopics: ['arrays_methods', 'free_text_topic'],
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет дубликаты тем', () => {
    const result = testSetupSchema.safeParse({
      ...base,
      subtopics: ['arrays_methods', 'arrays_methods'],
    });
    expect(result.success).toBe(false);
  });

  it('длина теста — только 5 или 10 вопросов', () => {
    expect(testSetupSchema.safeParse({ ...base, subtopics: ['event_loop'], questionCount: 7 }).success).toBe(
      false,
    );
    expect(
      testSetupSchema.safeParse({
        ...base,
        subtopics: ['event_loop'],
        questionCount: MAX_QUESTIONS,
      }).success,
    ).toBe(true);
  });

  it('ключи тем уникальны в конфиге', () => {
    expect(new Set(JS_SUBTOPIC_KEYS).size).toBe(JS_SUBTOPIC_KEYS.length);
  });
});
