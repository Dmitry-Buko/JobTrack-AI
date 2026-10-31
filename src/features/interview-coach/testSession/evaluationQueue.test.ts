import { describe, expect, it } from 'vitest';

import type { EvaluationEntry } from './testSessionSlice';
import {
  MAX_PARALLEL_EVALUATIONS,
  evaluationProgress,
  isRetryableEvaluationError,
  pickNextEvaluations,
} from './evaluationQueue';

function entry(id: string, status: EvaluationEntry['status'], attempt = 0): EvaluationEntry {
  return {
    userMessageId: id,
    question: 'Вопрос',
    answer: 'Ответ',
    subtopic: null,
    status,
    attempt,
    error: null,
  };
}

describe('pickNextEvaluations', () => {
  it('запускает не больше двух задач одновременно', () => {
    const queue = {
      m1: entry('m1', 'pending'),
      m2: entry('m2', 'pending'),
      m3: entry('m3', 'pending'),
    };
    expect(pickNextEvaluations(queue)).toEqual(['m1', 'm2']);
  });

  it('учитывает уже идущие задачи против лимита', () => {
    const queue = {
      m1: entry('m1', 'inflight'),
      m2: entry('m2', 'pending'),
      m3: entry('m3', 'pending'),
    };
    expect(pickNextEvaluations(queue)).toEqual(['m2']);
  });

  it('не запускает failed-задачи', () => {
    const queue = {
      m1: entry('m1', 'failed'),
      m2: entry('m2', 'pending'),
    };
    expect(pickNextEvaluations(queue)).toEqual(['m2']);
  });

  it('пустая очередь — пустой выбор', () => {
    expect(pickNextEvaluations({})).toEqual([]);
  });
});

describe('isRetryableEvaluationError', () => {
  it('сетевой сбой и 5xx повторяемы', () => {
    expect(isRetryableEvaluationError(0)).toBe(true);
    expect(isRetryableEvaluationError(502)).toBe(true);
    expect(isRetryableEvaluationError(503)).toBe(true);
    expect(isRetryableEvaluationError(undefined)).toBe(true);
  });

  it('лимит (429) и плохой запрос (400) — финальные', () => {
    expect(isRetryableEvaluationError(429)).toBe(false);
    expect(isRetryableEvaluationError(400)).toBe(false);
  });
});

describe('evaluationProgress', () => {
  it('считает оценённые как разницу между итогом и очередью', () => {
    const queue = {
      m1: entry('m1', 'inflight'),
      m2: entry('m2', 'failed'),
    };
    expect(evaluationProgress(queue, 5)).toEqual({ evaluated: 3, total: 5 });
  });

  it('не уходит в минус при лишних задачах', () => {
    expect(evaluationProgress({ m1: entry('m1', 'pending') }, 0)).toEqual({ evaluated: 0, total: 0 });
  });

  it('поддерживает лимит параллелизма в 2', () => {
    expect(MAX_PARALLEL_EVALUATIONS).toBe(2);
  });
});
