import type { EvaluationEntry } from './testSessionSlice';

/** Параллелизм фоновых оценок: не больше двух запросов одновременно. */
export const MAX_PARALLEL_EVALUATIONS = 2;

/** Пауза перед авто-повтором оценки (мс). */
export const EVALUATION_RETRY_DELAY_MS = 1500;

/**
 * Повторяемая ошибка: сеть (status 0) или сбой сервера (5xx).
 * 429 (лимит) и 400 — финальные: повтор ничего не изменит.
 */
export function isRetryableEvaluationError(status: number | undefined): boolean {
  if (status === undefined) return true; // нет статуса — считаем сетевым сбоем
  return status === 0 || status >= 500;
}

/**
 * Выбирает задачи для запуска: pending-задачи, пока inflight меньше лимита.
 * Порядок — добавления (стабильная итерация по ключам объекта-очереди).
 */
export function pickNextEvaluations(
  evaluations: Record<string, EvaluationEntry>,
  max = MAX_PARALLEL_EVALUATIONS,
): string[] {
  const inflight = Object.values(evaluations).filter((entry) => entry.status === 'inflight').length;
  const picked: string[] = [];
  for (const [id, entry] of Object.entries(evaluations)) {
    if (picked.length + inflight >= max) break;
    if (entry.status === 'pending') picked.push(id);
  }
  return picked;
}

/** Сколько задач завершено (успехом — их нет в очереди, либо ждут в failed). */
export function evaluationProgress(evaluations: Record<string, EvaluationEntry>, total: number) {
  const remaining = Object.keys(evaluations).length;
  return { evaluated: Math.max(0, total - remaining), total };
}
