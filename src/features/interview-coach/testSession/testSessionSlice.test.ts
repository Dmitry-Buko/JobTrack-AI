import { describe, expect, it } from 'vitest';

import {
  answerSubmitted,
  evaluationRejected,
  evaluationResolved,
  evaluationRetry,
  evaluationStarted,
  evaluationsEnqueued,
  finishRequested,
  resetTestSession,
  sessionAborted,
  sessionFinished,
  sessionRestored,
  testStarted,
  testSessionReducer,
  type TestSessionState,
} from './testSessionSlice';

const initialState: TestSessionState = testSessionReducer(undefined, { type: '@@INIT' });

const task = (id: string, answer = 'Мой ответ') => ({
  userMessageId: id,
  question: 'Что такое замыкание?',
  answer,
  subtopic: 'functions_closures',
});

describe('testSessionSlice — прохождение теста', () => {
  it('testStarted задаёт сессию и обнуляет прогресс', () => {
    const state = testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 5 }));
    expect(state).toMatchObject({ sessionId: 's1', status: 'running', questionCount: 5, answeredCount: 0 });
    expect(Object.keys(state.evaluations)).toHaveLength(0);
  });

  it('answerSubmitted двигает прогресс (ответ и пропусок считаются одинаково)', () => {
    let state = testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 3 }));
    state = testSessionReducer(state, answerSubmitted());
    state = testSessionReducer(state, answerSubmitted());
    expect(state.answeredCount).toBe(2);
  });

  it('досрочное завершение: finishRequested → sessionAborted', () => {
    let state = testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 3 }));
    state = testSessionReducer(state, answerSubmitted());
    state = testSessionReducer(state, finishRequested());
    expect(state.status).toBe('finishing');
    state = testSessionReducer(state, sessionAborted());
    expect(state.status).toBe('aborted');
  });

  it('sessionFinished фиксирует завершение', () => {
    let state = testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 1 }));
    state = testSessionReducer(state, answerSubmitted());
    state = testSessionReducer(state, finishRequested());
    state = testSessionReducer(state, sessionFinished());
    expect(state.status).toBe('finished');
  });

  it('resetTestSession возвращает начальное состояние', () => {
    let state = testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 5 }));
    state = testSessionReducer(state, resetTestSession());
    expect(state).toEqual(initialState);
  });
});

describe('testSessionSlice — восстановление после перезагрузки', () => {
  it('sessionRestored восстанавливает прогресс и ставит неоценённые ответы в очередь', () => {
    const state = testSessionReducer(
      initialState,
      sessionRestored({
        sessionId: 's1',
        questionCount: 5,
        answeredCount: 2,
        status: 'running',
        unevaluatedTasks: [task('m1'), task('m2')],
      }),
    );
    expect(state.sessionId).toBe('s1');
    expect(state.answeredCount).toBe(2);
    expect(state.status).toBe('running');
    expect(Object.values(state.evaluations)).toHaveLength(2);
    expect(state.evaluations.m1).toMatchObject({ status: 'pending', attempt: 0 });
  });

  it('повторное восстановление той же сессии не дублирует задачи', () => {
    let state = testSessionReducer(
      initialState,
      sessionRestored({
        sessionId: 's1',
        questionCount: 5,
        answeredCount: 1,
        status: 'running',
        unevaluatedTasks: [task('m1')],
      }),
    );
    state = testSessionReducer(
      state,
      sessionRestored({
        sessionId: 's1',
        questionCount: 5,
        answeredCount: 1,
        status: 'running',
        unevaluatedTasks: [task('m1')],
      }),
    );
    expect(Object.values(state.evaluations)).toHaveLength(1);
  });

  it('восстановление другой сессии сбрасывает старую очередь', () => {
    let state = testSessionReducer(
      initialState,
      sessionRestored({
        sessionId: 's1',
        questionCount: 5,
        answeredCount: 1,
        status: 'running',
        unevaluatedTasks: [task('m1')],
      }),
    );
    state = testSessionReducer(
      state,
      sessionRestored({
        sessionId: 's2',
        questionCount: 3,
        answeredCount: 0,
        status: 'running',
        unevaluatedTasks: [],
      }),
    );
    expect(state.sessionId).toBe('s2');
    expect(Object.keys(state.evaluations)).toHaveLength(0);
  });
});

describe('testSessionSlice — очередь фоновых оценок', () => {
  const started = () =>
    testSessionReducer(
      testSessionReducer(initialState, testStarted({ sessionId: 's1', questionCount: 2 })),
      evaluationsEnqueued([task('m1'), task('m2')]),
    );

  it('успех: started → resolved удаляет задачу', () => {
    let state = started();
    state = testSessionReducer(state, evaluationStarted('m1'));
    expect(state.evaluations.m1.status).toBe('inflight');
    state = testSessionReducer(state, evaluationResolved('m1'));
    expect(state.evaluations.m1).toBeUndefined();
    expect(state.evaluations.m2.status).toBe('pending');
  });

  it('сетевая ошибка: один авто-повтор, вторая ошибка — финальная', () => {
    let state = started();
    state = testSessionReducer(
      state,
      evaluationRejected({ userMessageId: 'm1', retryable: true, error: 'Сеть' }),
    );
    expect(state.evaluations.m1).toMatchObject({ status: 'pending', attempt: 1 });

    state = testSessionReducer(state, evaluationStarted('m1'));
    state = testSessionReducer(
      state,
      evaluationRejected({ userMessageId: 'm1', retryable: true, error: 'Сеть снова' }),
    );
    expect(state.evaluations.m1).toMatchObject({ status: 'failed', error: 'Сеть снова' });
  });

  it('лимит (429) — сразу финальная ошибка без повторов', () => {
    let state = started();
    state = testSessionReducer(state, evaluationStarted('m2'));
    state = testSessionReducer(
      state,
      evaluationRejected({
        userMessageId: 'm2',
        retryable: false,
        error: 'Достигнут лимит оценок за час.',
      }),
    );
    expect(state.evaluations.m2).toMatchObject({
      status: 'failed',
      error: 'Достигнут лимит оценок за час.',
    });
  });

  it('evaluationRetry возвращает failed-задачу в очередь', () => {
    let state = started();
    state = testSessionReducer(
      state,
      evaluationRejected({ userMessageId: 'm1', retryable: false, error: 'Лимит' }),
    );
    state = testSessionReducer(state, evaluationRetry('m1'));
    expect(state.evaluations.m1).toMatchObject({ status: 'pending', attempt: 0, error: null });
  });

  it('неизвестные id игнорируются', () => {
    const state = testSessionReducer(started(), evaluationResolved('nope'));
    expect(Object.values(state.evaluations)).toHaveLength(2);
  });
});
