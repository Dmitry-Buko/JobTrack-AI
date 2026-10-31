import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Состояние тестовой сессии: лёгкое зеркало прогресса (источник данных — БД,
 * зеркало нужно для мгновенного UI и восстановления после перезагрузки)
 * и очередь фоновых оценок ответов.
 */

export type TestSessionStatus = 'idle' | 'running' | 'finishing' | 'finished' | 'aborted';

/** Сколько авто-повторов допустимо для повторяемой ошибки (сетевой сбой и т.п.). */
export const MAX_RETRYABLE_ATTEMPTS = 2;

export type EvaluationTaskStatus = 'pending' | 'inflight' | 'failed';

export interface EvaluationTask {
  /** id сообщения-ответа — по нему оценка записывается в БД. */
  userMessageId: string;
  question: string;
  answer: string;
  subtopic: string | null;
}

export interface EvaluationEntry extends EvaluationTask {
  status: EvaluationTaskStatus;
  attempt: number;
  /** Причина неудачи для UI (например, текст про лимит запросов). */
  error: string | null;
}

export interface TestSessionState {
  sessionId: string | null;
  status: TestSessionStatus;
  questionCount: number;
  /** Ответы и пропуски — определяют текущий вопрос. */
  answeredCount: number;
  /** Очередь фоновых оценок: key = userMessageId. */
  evaluations: Record<string, EvaluationEntry>;
}

const initialState: TestSessionState = {
  sessionId: null,
  status: 'idle',
  questionCount: 0,
  answeredCount: 0,
  evaluations: {},
};

export const testSessionSlice = createSlice({
  name: 'testSession',
  initialState,
  reducers: {
    /** Новый тест начат (сессия создана, вопросы получены). */
    testStarted(state, action: PayloadAction<{ sessionId: string; questionCount: number }>) {
      state.sessionId = action.payload.sessionId;
      state.status = 'running';
      state.questionCount = action.payload.questionCount;
      state.answeredCount = 0;
      state.evaluations = {};
    },

    /** Ответ или пропуск отправлены в БД — следующий вопрос. */
    answerSubmitted(state) {
      state.answeredCount += 1;
    },

    /** Начато формирование итогового отчёта. */
    finishRequested(state) {
      state.status = 'finishing';
    },

    sessionFinished(state) {
      state.status = 'finished';
    },

    sessionAborted(state) {
      state.status = 'aborted';
    },

    /**
     * Восстановление после перезагрузки: прогресс и неоценённые ответы — из БД.
     * Перезаписывает зеркало целиком, задачи без оценки встают в очередь.
     */
    sessionRestored(
      state,
      action: PayloadAction<{
        sessionId: string;
        questionCount: number;
        answeredCount: number;
        status: TestSessionStatus;
        unevaluatedTasks: EvaluationTask[];
      }>,
    ) {
      const { sessionId, questionCount, answeredCount, status, unevaluatedTasks } = action.payload;
      // Уже идущая работа другой вкладки не сбрасывается без необходимости.
      if (state.sessionId !== sessionId) {
        state.sessionId = sessionId;
        state.evaluations = {};
      }
      state.questionCount = questionCount;
      state.answeredCount = answeredCount;
      state.status = status;

      const known = new Set(unevaluatedTasks.map((task) => task.userMessageId));
      // Убираем failed-задачи, которых больше нет в БД (ответ оценён в другой вкладке).
      for (const id of Object.keys(state.evaluations)) {
        if (!known.has(id) && state.evaluations[id].status === 'failed') {
          delete state.evaluations[id];
        }
      }
      for (const task of unevaluatedTasks) {
        const existing = state.evaluations[task.userMessageId];
        if (!existing) {
          state.evaluations[task.userMessageId] = { ...task, status: 'pending', attempt: 0, error: null };
        }
      }
    },

    /** Ответы отправлены в очередь оценок (после вставки в БД или восстановления). */
    evaluationsEnqueued(state, action: PayloadAction<EvaluationTask[]>) {
      for (const task of action.payload) {
        if (!state.evaluations[task.userMessageId]) {
          state.evaluations[task.userMessageId] = { ...task, status: 'pending', attempt: 0, error: null };
        }
      }
    },

    evaluationStarted(state, action: PayloadAction<string>) {
      const entry = state.evaluations[action.payload];
      if (entry) entry.status = 'inflight';
    },

    /** Оценка сохранена в БД — задача покидает очередь. */
    evaluationResolved(state, action: PayloadAction<string>) {
      delete state.evaluations[action.payload];
    },

    /**
     * Оценка не удалась: при повторяемой ошибке и остатке попыток — назад в очередь,
     * иначе — финальная неудача с причиной для UI.
     */
    evaluationRejected(
      state,
      action: PayloadAction<{ userMessageId: string; retryable: boolean; error: string }>,
    ) {
      const { userMessageId, retryable, error } = action.payload;
      const entry = state.evaluations[userMessageId];
      if (!entry) return;
      if (retryable && entry.attempt + 1 < MAX_RETRYABLE_ATTEMPTS) {
        entry.attempt += 1;
        entry.status = 'pending';
        entry.error = null;
        return;
      }
      entry.status = 'failed';
      entry.error = error;
    },

    /** Ручной повтор неудавшейся оценки (кнопка «Повторить» в разборе). */
    evaluationRetry(state, action: PayloadAction<string>) {
      const entry = state.evaluations[action.payload];
      if (!entry) return;
      entry.status = 'pending';
      entry.attempt = 0;
      entry.error = null;
    },

    resetTestSession() {
      return initialState;
    },
  },
});

export const {
  testStarted,
  answerSubmitted,
  finishRequested,
  sessionFinished,
  sessionAborted,
  sessionRestored,
  evaluationsEnqueued,
  evaluationStarted,
  evaluationResolved,
  evaluationRejected,
  evaluationRetry,
  resetTestSession,
} = testSessionSlice.actions;

export const testSessionReducer = testSessionSlice.reducer;
