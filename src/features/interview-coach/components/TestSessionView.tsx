import { Check, Lightbulb, SendHorizontal, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppDispatch } from '@/app/hooks';
import {
  useAddMessagesMutation,
  useFinishSessionMutation,
  useGetMessagesQuery,
  useUpdateMessageMutation,
} from '../api/sessionsApi';
import {
  useGenerateQuestionsMutation,
  useGenerateReportMutation,
  useGetHintMutation,
} from '@/features/ai/api/aiApi';
import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { assembleReport } from '@/features/ai/lib/report';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { DIFFICULTY_LABELS, TOPIC_LABELS, type InterviewSession } from '@/types/interview';
import { SKIP_ANSWER_TEXT } from '../lib/constants';
import { subtopicLabel } from '../lib/subtopics';
import {
  answerSubmitted,
  evaluationsEnqueued,
  finishRequested,
  sessionFinished,
  sessionRestored,
  testStarted,
  type EvaluationTask,
} from '../testSession/testSessionSlice';
import { useEvaluationWorker } from '../testSession/useEvaluationWorker';

const MIN_ANSWER_LENGTH = 2;

/** Задачи для фоновой оценки: ответы без evaluation (кроме уже оценённых). */
function collectUnevaluated(
  messages: Array<{ id: string; role: string; content: string; evaluation: unknown; subtopic: string | null }>,
): EvaluationTask[] {
  const questions = messages.filter((message) => message.role === 'assistant');
  const answers = messages.filter((message) => message.role === 'user');
  const tasks: EvaluationTask[] = [];
  answers.forEach((answer, index) => {
    if (answer.evaluation !== null) return;
    const question = questions[index];
    if (!question) return;
    tasks.push({
      userMessageId: answer.id,
      question: question.content,
      answer: answer.content,
      subtopic: question.subtopic,
    });
  });
  return tasks;
}

export function TestSessionView({
  session,
  onFinished,
}: {
  session: InterviewSession;
  onFinished: () => void;
}) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { data: messages = [], isLoading: isLoadingMessages, refetch } = useGetMessagesQuery(session.id);
  const { data: applications = [] } = useGetApplicationsQuery();
  const [addMessages] = useAddMessagesMutation();
  const [updateMessage] = useUpdateMessageMutation();
  const [generateQuestions, { isLoading: isGenerating }] = useGenerateQuestionsMutation();
  const [requestHint, { isLoading: isHintLoading }] = useGetHintMutation();
  const [generateReport] = useGenerateReportMutation();
  const [finishSession] = useFinishSessionMutation();

  const [answerDraft, setAnswerDraft] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [earlyFinishOpen, setEarlyFinishOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const questionStartRef = useRef(Date.now());
  const justSavedTimerRef = useRef<number | null>(null);

  const generationStarted = useRef(false);
  const restoredRef = useRef(false);
  const finishStarted = useRef(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEvaluationWorker(session);

  const questions = useMemo(
    () => messages.filter((message) => message.role === 'assistant'),
    [messages],
  );
  const answers = useMemo(() => messages.filter((message) => message.role === 'user'), [messages]);
  const currentIndex = answers.length;
  const isComplete = questions.length > 0 && currentIndex >= questions.length;
  const currentQuestion = isComplete ? null : questions[currentIndex];

  const application = session.application_id
    ? (applications.find((item) => item.id === session.application_id) ?? null)
    : null;

  // Восстановление после перезагрузки: прогресс и очередь — из БД.
  useEffect(() => {
    if (isLoadingMessages || restoredRef.current || questions.length === 0) return;
    restoredRef.current = true;
    dispatch(
      sessionRestored({
        sessionId: session.id,
        questionCount: questions.length,
        answeredCount: answers.length,
        status: 'running',
        unevaluatedTasks: collectUnevaluated(messages),
      }),
    );
  }, [isLoadingMessages, messages, questions.length, answers.length, session.id, dispatch]);

  // Генерация вопросов при первом открытии пустой сессии.
  useEffect(() => {
    if (isLoadingMessages || questions.length > 0 || generationStarted.current) return;
    generationStarted.current = true;

    void (async () => {
      try {
        const result = await generateQuestions({
          topic: session.topic,
          difficulty: session.difficulty,
          language: session.language,
          questionCount: session.question_count,
          application: application
            ? {
                company: application.company,
                position: application.position,
                description: application.description,
              }
            : null,
          subtopics: session.selected_topics ?? null,
        }).unwrap();

        await addMessages({
          sessionId: session.id,
          messages: result.map((item, index) => ({
            session_id: session.id,
            role: 'assistant' as const,
            content: item.question,
            turn_index: index,
            evaluation: null,
            subtopic: item.subtopic,
            hint_used: false,
          })),
        }).unwrap();
        dispatch(testStarted({ sessionId: session.id, questionCount: result.length }));
      } catch (error) {
        console.error('[test-session] Не удалось сгенерировать вопросы:', error);
        generationStarted.current = false;
        toast.error('Не удалось сгенерировать вопросы. Попробуйте ещё раз.');
      }
    })();
    // Настройки сессии и контекст вакансии не меняются в рамках сессии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessages, questions.length]);

  const enqueueEvaluation = async (content: string, questionText: string, subtopic: string | null) => {
    try {
      const inserted = await addMessages({
        sessionId: session.id,
        messages: [
          {
            session_id: session.id,
            role: 'user',
            content,
            turn_index: questions.length + currentIndex,
            evaluation: null,
            subtopic: null,
            hint_used: false,
          },
        ],
      }).unwrap();
      dispatch(answerSubmitted());
      const insertedMessage = inserted[0];
      if (insertedMessage) {
        dispatch(
          evaluationsEnqueued([
            { userMessageId: insertedMessage.id, question: questionText, answer: content, subtopic },
          ]),
        );
      }
      return true;
    } catch (error) {
      console.error('[test-session] Не удалось сохранить ответ:', error);
      toast.error('Не удалось сохранить ответ. Проверьте соединение.');
      return false;
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || submitting) return;
    const trimmed = answerDraft.trim();
    if (trimmed.length < MIN_ANSWER_LENGTH) {
      setAnswerError('Напишите ответ — минимум пара слов.');
      return;
    }
    setAnswerError(null);
    setSubmitting(true);
    const ok = await enqueueEvaluation(trimmed, currentQuestion.content, currentQuestion.subtopic);
    setSubmitting(false);
    if (ok) {
      setAnswerDraft('');
      setHint(null);
      showJustSaved();
    }
  };

  const skipQuestion = async () => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);
    await enqueueEvaluation(SKIP_ANSWER_TEXT, currentQuestion.content, currentQuestion.subtopic);
    setSubmitting(false);
    setHint(null);
  };

  const askHint = async () => {
    if (!currentQuestion) return;
    try {
      const hintText = await requestHint({
        question: currentQuestion.content,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
        subtopic: currentQuestion.subtopic,
      }).unwrap();
      setHint(hintText);
      await updateMessage({ id: currentQuestion.id, sessionId: session.id, hintUsed: true }).unwrap();
    } catch (error) {
      console.error('[test-session] Подсказка недоступна:', error);
      toast.error('Подсказка недоступна. Попробуйте ещё раз.');
    }
  };

  const finish = async () => {
    if (finishStarted.current) return;
    finishStarted.current = true;
    setFinishing(true);
    dispatch(finishRequested());
    try {
      const aiReport = await generateReport({
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          evaluation:
            message.evaluation && !('skipped' in message.evaluation) ? message.evaluation : undefined,
        })),
      }).unwrap();

      await finishSession({
        id: session.id,
        status: 'completed',
        summary: aiReport.summary,
        report: assembleReport(aiReport, messages),
      }).unwrap();
      dispatch(sessionFinished());
      onFinished();
    } catch (error) {
      console.error('[test-session] Не удалось сформировать отчёт:', error);
      finishStarted.current = false;
      setFinishing(false);
      toast.error('Не удалось сформировать отчёт. Попробуйте ещё раз.');
    }
  };

  // Авто-финиш: отвечен последний вопрос.
  useEffect(() => {
    if (isComplete && !finishing && !finishStarted.current) {
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  // Фокус на поле ответа и сброс таймера при смене вопроса.
  useEffect(() => {
    answerRef.current?.focus();
    questionStartRef.current = Date.now();
    setElapsedSeconds(0);
  }, [currentIndex]);

  // Живой таймер текущего вопроса (раз в секунду).
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Индикатор «Ответ сохранён» живёт 450 мс и гаснет сам.
  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current !== null) window.clearTimeout(justSavedTimerRef.current);
    };
  }, []);

  const showJustSaved = () => {
    setJustSaved(true);
    if (justSavedTimerRef.current !== null) window.clearTimeout(justSavedTimerRef.current);
    justSavedTimerRef.current = window.setTimeout(() => setJustSaved(false), 450);
  };

  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        {isGenerating ? (
          <>
            <Skeleton className="h-6 w-48" />
            <p className="text-[15px] text-muted">ИИ подбирает вопросы по выбранным темам…</p>
          </>
        ) : (
          <>
            <p className="text-[15px] text-muted">Вопросы не сгенерированы.</p>
            <Button
              variant="secondary"
              onClick={() => {
                generationStarted.current = false;
                void refetch();
              }}
            >
              Попробовать снова
            </Button>
          </>
        )}
      </div>
    );
  }

  if (finishing || isComplete) {
    return <PageLoader label="Формируем результаты теста…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-text">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
          </p>
          <p className="text-[13px] text-muted">
            {currentQuestion?.subtopic ? subtopicLabel(currentQuestion.subtopic) : 'Тест'}
          </p>
        </div>
        <span className="flex items-center gap-3">
          <span
            className="tabular text-[13px] font-medium text-muted"
            aria-hidden
            title="Время на текущий вопрос"
          >
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </span>
          <span className="tabular text-[13px] font-medium text-muted">
            {currentIndex} / {questions.length} отвечено
          </span>
        </span>
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={currentIndex}
        aria-label="Прогресс теста"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-[var(--ease-ios)]"
          style={{ width: `${(currentIndex / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex h-5 items-center justify-end" aria-live="polite">
        {justSaved && (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-success-strong animate-appear">
            <Check className="size-3.5" strokeWidth={2} aria-hidden />
            Ответ сохранён
          </p>
        )}
      </div>

      <section className="squircle rounded-card bg-surface p-5 shadow-card sm:p-6" aria-live="polite">
        <p className="text-[13px] font-semibold tracking-[0.01em] text-accent uppercase">
          Вопрос {currentIndex + 1} из {questions.length}
        </p>
        <p className="mt-2 text-[20px] leading-snug font-semibold tracking-[-0.01em] text-text animate-appear">
          {currentQuestion?.content}
        </p>

        {hint && (
          <p className="mt-4 flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-warning-strong animate-appear">
            <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Подсказка: {hint}
          </p>
        )}

        <textarea
          ref={answerRef}
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submitAnswer();
            }
          }}
          aria-label="Ваш ответ на вопрос"
          placeholder="Напишите ответ своими словами"
          rows={6}
          disabled={submitting}
          className="squircle mt-5 w-full rounded-control bg-surface-muted px-3 py-2.5 text-[15px] text-text transition duration-200 ease-[var(--ease-ios)] placeholder:text-muted focus:bg-surface focus:ring-2 focus:ring-accent/60 focus:outline-none disabled:opacity-50"
        />
        {answerError && (
          <p className="mt-1.5 text-[13px] text-danger-strong" role="alert">
            {answerError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void submitAnswer()}
            loading={submitting}
            icon={<SendHorizontal className="size-4" strokeWidth={1.75} aria-hidden />}
          >
            Ответить
          </Button>
          <Button
            variant="secondary"
            onClick={() => void askHint()}
            loading={isHintLoading}
            icon={<Lightbulb className="size-4" strokeWidth={1.75} aria-hidden />}
          >
            Подсказка
          </Button>
          <Button
            variant="ghost"
            onClick={() => void skipQuestion()}
            disabled={submitting}
            icon={<SkipForward className="size-4" strokeWidth={1.75} aria-hidden />}
          >
            Пропустить
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted">Ctrl + Enter — отправить ответ</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-strong hover:bg-danger-soft hover:text-danger-strong"
          onClick={() => setEarlyFinishOpen(true)}
        >
          Завершить досрочно
        </Button>
      </div>

      <ConfirmDialog
        open={earlyFinishOpen}
        title="Завершить тест досрочно?"
        message={`Отвечено ${answers.length} из ${questions.length} вопросов. Отчёт и разбор будут по пройденной части.`}
        confirmLabel="Завершить"
        loading={finishing}
        onCancel={() => setEarlyFinishOpen(false)}
        onConfirm={() => {
          setEarlyFinishOpen(false);
          void finish();
        }}
      />
    </div>
  );
}
