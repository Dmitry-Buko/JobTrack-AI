import { describe, expect, it } from 'vitest';

import type { AnswerEvaluation, InterviewMessage } from '@/types/interview';

import { averageByCriterion, computeOverallScore } from './report';

function evaluationWith(scores: Array<number | 'insufficient'>): AnswerEvaluation {
  const keys = ['correctness', 'completeness', 'understanding', 'practical_application', 'explanation_quality'] as const;
  const entries = keys.map((key, index) => {
    const value = scores[index];
    return [
      key,
      typeof value === 'number'
        ? { score: value as 1 | 2 | 3 | 4 | 5, comment: '' }
        : { status: 'insufficient_data' as const, comment: '' },
    ] as const;
  });
  return {
    scores: Object.fromEntries(entries) as AnswerEvaluation['scores'],
    strengths: [],
    gaps: [],
    model_answer: '',
    follow_up_question: null,
  };
}

function message(role: 'assistant' | 'user', evaluation: unknown = null): Pick<InterviewMessage, 'role' | 'content' | 'evaluation'> {
  return { role, content: 'текст', evaluation: evaluation as InterviewMessage['evaluation'] };
}

describe('computeOverallScore', () => {
  it('усредняет числовые оценки по всем ответам', () => {
    const messages = [
      message('assistant'),
      message('user', evaluationWith([5, 4, 5, 4, 5])),
      message('assistant'),
      message('user', evaluationWith([3, 4, 3, 4, 3])),
    ];
    // (5+4+5+4+5 + 3+4+3+4+3) / 10 = 4.0
    expect(computeOverallScore(messages)).toBe(4);
  });

  it('игнорирует insufficient_data и пропущенные', () => {
    const messages = [
      message('user', evaluationWith([5, 'insufficient', 5, 'insufficient', 5])),
      message('user', { skipped: true }),
    ];
    expect(computeOverallScore(messages)).toBe(5);
  });

  it('возвращает null без числовых оценок', () => {
    expect(computeOverallScore([message('assistant'), message('user', { skipped: true })])).toBeNull();
    expect(computeOverallScore([])).toBeNull();
  });
});

describe('averageByCriterion', () => {
  it('считает среднее по каждому критерию отдельно', () => {
    const messages = [
      message('user', evaluationWith([5, 3, 4, 2, 1])),
      message('user', evaluationWith([3, 3, 2, 2, 3])),
    ];
    const averages = averageByCriterion(messages);
    expect(averages.correctness).toBe(4);
    expect(averages.completeness).toBe(3);
    expect(averages.explanation_quality).toBe(2);
  });
});
