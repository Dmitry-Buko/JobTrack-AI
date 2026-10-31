import { useCallback, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useEvaluateAnswerMutation } from '@/features/ai/api/aiApi';
import { useUpdateMessageMutation } from '../api/sessionsApi';
import type { AnswerEvaluation, InterviewSession } from '@/types/interview';
import {
  evaluationRejected,
  evaluationResolved,
  evaluationStarted,
  type EvaluationEntry,
} from './testSessionSlice';
import {
  EVALUATION_RETRY_DELAY_MS,
  isRetryableEvaluationError,
  pickNextEvaluations,
} from './evaluationQueue';

/**
 * Воркер фоновой очереди оценок: пока позволяет параллелизм, запускает
 * pending-задачи через evaluate-answer и пишет результат в сообщение ответа.
 * Используется и во время теста, и на экране результатов — очередь дожимается.
 */
export function useEvaluationWorker(
  session: Pick<InterviewSession, 'topic' | 'difficulty' | 'language'>,
) {
  const dispatch = useAppDispatch();
  const sessionId = useAppSelector((state) => state.testSession.sessionId);
  const evaluations = useAppSelector((state) => state.testSession.evaluations);
  const [evaluateAnswer] = useEvaluateAnswerMutation();
  const [updateMessage] = useUpdateMessageMutation();

  /** id задач, по которым уже висит незавершённый запуск (таймер или запрос). */
  const launchingRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  const runOne = useCallback(
    async (entry: EvaluationEntry) => {
      const id = entry.userMessageId;
      dispatch(evaluationStarted(id));
      const result = await evaluateAnswer({
        question: entry.question,
        answer: entry.answer,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
        subtopic: entry.subtopic,
      });

      if ('data' in result && result.data) {
        const evaluation: AnswerEvaluation = result.data;
        try {
          await updateMessage({ id, sessionId: sessionId ?? '', evaluation }).unwrap();
          dispatch(evaluationResolved(id));
        } catch (saveError) {
          console.error('[evaluation-worker] Оценка не сохранилась в БД:', saveError);
          dispatch(
            evaluationRejected({
              userMessageId: id,
              retryable: true,
              error: 'Оценка готова, но не сохранилась. Нажмите «Повторить».',
            }),
          );
        }
        return;
      }

      const error = (result as { error?: { message?: string; status?: number } }).error;
      console.error('[evaluation-worker] Оценка не удалась:', {
        userMessageId: id,
        status: error?.status,
        message: error?.message,
      });
      dispatch(
        evaluationRejected({
          userMessageId: id,
          retryable: isRetryableEvaluationError(error?.status),
          error: error?.message ?? 'Не удалось оценить ответ.',
        }),
      );
    },
    [dispatch, evaluateAnswer, updateMessage, session, sessionId],
  );

  useEffect(() => {
    for (const id of pickNextEvaluations(evaluations)) {
      if (launchingRef.current.has(id)) continue;
      const entry = evaluations[id];
      if (!entry) continue;
      launchingRef.current.add(id);
      const delay = entry.attempt > 0 ? EVALUATION_RETRY_DELAY_MS : 0;
      const timer = window.setTimeout(() => {
        launchingRef.current.delete(id);
        // Задача могла исчезнуть, пока ждали задержку повтора, — runOne это учтёт
        // диспетчером в несуществующую запись (редьюсеры игнорируют чужие id).
        void runOne(entry).catch((unexpected) => {
          console.error('[evaluation-worker] Неожиданный сбой задачи:', unexpected);
          dispatch(
            evaluationRejected({
              userMessageId: id,
              retryable: false,
              error: 'Не удалось оценить ответ. Попробуйте ещё раз.',
            }),
          );
        });
      }, delay);
      timersRef.current.push(timer);
    }
  }, [evaluations, runOne, dispatch]);

  // Снятие компонента — незапущенные таймеры отменяем.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);
}
