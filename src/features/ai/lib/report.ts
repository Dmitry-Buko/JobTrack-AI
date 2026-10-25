import type {
  AnswerEvaluation,
  EvaluationCriterion,
  InterviewMessage,
  SessionReport,
  SkippedAnswerMark,
} from '@/types/interview';

import type { reportResponseSchema } from './schemas';

export type ReportAiPart = ReturnType<typeof reportResponseSchema.parse>;

function isEvaluation(
  value: AnswerEvaluation | SkippedAnswerMark | null | undefined,
): value is AnswerEvaluation {
  return Boolean(value) && !('skipped' in (value as SkippedAnswerMark));
}

function numericScores(evaluation: AnswerEvaluation): number[] {
  return Object.values(evaluation.scores)
    .map((score) => ('score' in score ? score.score : null))
    .filter((score): score is 1 | 2 | 3 | 4 | 5 => score !== null);
}

/**
 * Средний балл по всем оценённым критериям всех ответов (1–5).
 * null — если ни один критерий не был оценён числом.
 */
export function computeOverallScore(messages: Pick<InterviewMessage, 'role' | 'evaluation'>[]): number | null {
  const all: number[] = [];
  for (const message of messages) {
    if (message.role !== 'user' || !isEvaluation(message.evaluation)) continue;
    all.push(...numericScores(message.evaluation));
  }
  if (all.length === 0) return null;
  return Math.round((all.reduce((sum, score) => sum + score, 0) / all.length) * 10) / 10;
}

/** Собирает итоговый SessionReport из ответа AI и локальных данных диалога. */
export function assembleReport(
  ai: ReportAiPart,
  messages: Pick<InterviewMessage, 'role' | 'content' | 'evaluation'>[],
): SessionReport {
  return {
    total_questions: ai.total_questions,
    answered_questions: ai.answered_questions,
    skipped_questions: ai.skipped_questions,
    overall_score: computeOverallScore(messages),
    strengths: ai.strengths,
    weak_topics: ai.weak_topics,
    weak_answers: ai.weak_answers,
    topics_to_review: ai.topics_to_review,
    recommendations: ai.recommendations,
    conclusion: ai.conclusion,
  };
}

/** Средняя оценка по одному критерию — для дашборда и отчёта. */
export function averageByCriterion(
  messages: Pick<InterviewMessage, 'role' | 'evaluation'>[],
): Partial<Record<EvaluationCriterion, number>> {
  const sums = new Map<EvaluationCriterion, { sum: number; count: number }>();
  for (const message of messages) {
    if (message.role !== 'user' || !isEvaluation(message.evaluation)) continue;
    for (const [criterion, score] of Object.entries(message.evaluation.scores) as Array<
      [EvaluationCriterion, AnswerEvaluation['scores'][EvaluationCriterion]]
    >) {
      if (!('score' in score)) continue;
      const current = sums.get(criterion) ?? { sum: 0, count: 0 };
      sums.set(criterion, { sum: current.sum + score.score, count: current.count + 1 });
    }
  }
  const result: Partial<Record<EvaluationCriterion, number>> = {};
  for (const [criterion, { sum, count }] of sums) {
    result[criterion] = Math.round((sum / count) * 10) / 10;
  }
  return result;
}
