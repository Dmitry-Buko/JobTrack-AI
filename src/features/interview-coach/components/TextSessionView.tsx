import { BarChart3, Lightbulb, RotateCcw, SendHorizontal, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  useAddMessagesMutation,
  useFinishSessionMutation,
  useGetMessagesQuery,
} from '../api/sessionsApi';
import {
  useEvaluateAnswerMutation,
  useGenerateQuestionsMutation,
  useGenerateReportMutation,
  useGetHintMutation,
} from '@/features/ai/api/aiApi';
import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { assembleReport } from '@/features/ai/lib/report';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  DIFFICULTY_LABELS,
  TOPIC_LABELS,
  type InterviewMessage,
  type InterviewSession,
} from '@/types/interview';

import { EvaluationCard } from './EvaluationCard';
import { SKIP_ANSWER_TEXT } from '../lib/constants';

/** Диалог как в iMessage: вопрос интервьюера — серый пузырь слева, ответ — синий справа. */
function TranscriptItem({ message, questionNumber }: { message: InterviewMessage; questionNumber: number }) {
  if (message.role === 'assistant') {
    return (
      <div className="max-w-[85%] animate-appear sm:max-w-[75%]">
        <div className="squircle rounded-[20px] rounded-tl-[8px] bg-surface-muted px-4 py-3 shadow-card">
          <p className="mb-0.5 text-[12px] font-medium text-muted">Вопрос {questionNumber}</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{message.content}</p>
        </div>
      </div>
    );
  }

  const evaluation = message.evaluation;
  const isSkipped = message.content === SKIP_ANSWER_TEXT;

  return (
    <div className="ml-auto max-w-[85%] space-y-3 sm:max-w-[75%]">
      <div className="squircle ml-auto w-fit rounded-[20px] rounded-tr-[8px] bg-accent px-4 py-3 animate-appear">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-accent-contrast">
          {isSkipped ? '— Пропущено —' : message.content}
        </p>
      </div>
      {evaluation && !('skipped' in evaluation) && <EvaluationCard evaluation={evaluation} />}
    </div>
  );
}

function InterimResults({ messages }: { messages: InterviewMessage[] }) {
  const answered = messages.filter((message) => message.role === 'user');
  const scored = answered.filter(
    (message) => message.evaluation && !('skipped' in message.evaluation),
  );
  return (
    <div className="space-y-4">
      {answered.length === 0 && <p className="text-[15px] text-muted">Пока нет ответов на вопросы.</p>}
      <ListGroup>
        {answered.map((message, index) => {
          const evaluation =
            message.evaluation && !('skipped' in message.evaluation) ? message.evaluation : null;
          const numeric = evaluation
            ? Object.values(evaluation.scores)
              .map((score) => ('score' in score ? score.score : null))
              .filter((score): score is 1 | 2 | 3 | 4 | 5 => score !== null)
            : [];
          const average = numeric.length
            ? (numeric.reduce((sum, score) => sum + score, 0) / numeric.length).toFixed(1)
            : '—';
          return (
            <div
              key={message.id}
              className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] text-text">
                Ответ {index + 1}
                {message.content === SKIP_ANSWER_TEXT ? ' · пропущен' : ''}
              </span>
              <span className="tabular text-[15px] font-medium text-muted">{average}</span>
            </div>
          );
        })}
      </ListGroup>
      <p className="text-[13px] text-muted">
        Оценённых ответов: {scored.length} из {answered.length}.
      </p>
    </div>
  );
}

export function TextSessionView({
  session,
  onFinished,
}: {
  session: InterviewSession;
  onFinished: () => void;
}) {
  const toast = useToast();
  const { data: messages = [], isLoading: isLoadingMessages, refetch } = useGetMessagesQuery(session.id);
  const { data: applications = [] } = useGetApplicationsQuery();
  const [addMessages] = useAddMessagesMutation();
  const [generateQuestions, { isLoading: isGenerating }] = useGenerateQuestionsMutation();
  const [evaluateAnswer, { isLoading: isEvaluating }] = useEvaluateAnswerMutation();
  const [requestHint, { isLoading: isHintLoading }] = useGetHintMutation();
  const [generateReport, { isLoading: isReportLoading }] = useGenerateReportMutation();
  const [finishSession] = useFinishSessionMutation();

  const [answerDraft, setAnswerDraft] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [interimOpen, setInterimOpen] = useState(false);
  const [earlyFinishOpen, setEarlyFinishOpen] = useState(false);
  const generationStarted = useRef(false);

  const questions = useMemo(
    () => messages.filter((message) => message.role === 'assistant').map((message) => message.content),
    [messages],
  );
  const answers = useMemo(() => messages.filter((message) => message.role === 'user'), [messages]);

  const application = session.application_id
    ? (applications.find((item) => item.id === session.application_id) ?? null)
    : null;

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
      } catch {
        generationStarted.current = false;
        toast.error('Не удалось сгенерировать вопросы. Попробуйте ещё раз.');
      }
    })();
    // Контекст вакансии и настройки сессии не меняются в рамках сессии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessages, questions.length]);

  const currentQuestionIndex = answers.length;
  const isComplete = questions.length > 0 && currentQuestionIndex >= questions.length;
  const currentQuestion = isComplete ? null : questions[currentQuestionIndex];
  const isFinishing = isReportLoading;

  const persistAnswer = async (content: string, evaluation: unknown) => {
    await addMessages({
      sessionId: session.id,
      messages: [
        {
          session_id: session.id,
          role: 'user',
          content,
          turn_index: questions.length + currentQuestionIndex,
          evaluation: evaluation as InterviewMessage['evaluation'],
        },
      ],
    }).unwrap();
    setAnswerDraft('');
    setHint(null);
  };

  const submitAnswer = async () => {
    if (!currentQuestion) return;
    const trimmed = answerDraft.trim();
    if (trimmed.length < 2) {
      setAnswerError('Напишите ответ — минимум пара слов, чтобы ИИ было что оценивать.');
      return;
    }
    setAnswerError(null);
    try {
      const evaluation = await evaluateAnswer({
        question: currentQuestion,
        answer: trimmed,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
      }).unwrap();
      await persistAnswer(trimmed, evaluation);
    } catch {
      toast.error('Не удалось оценить ответ. Проверьте соединение и отправьте ещё раз.');
    }
  };

  const skipQuestion = async () => {
    if (!currentQuestion) return;
    try {
      // Оценка «пропуска» даёт эталонный ответ; критерии придут как insufficient_data.
      const evaluation = await evaluateAnswer({
        question: currentQuestion,
        answer: SKIP_ANSWER_TEXT,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
      }).unwrap();
      await persistAnswer(SKIP_ANSWER_TEXT, evaluation);
    } catch {
      toast.error('Не удалось пропустить вопрос. Попробуйте ещё раз.');
    }
  };

  const askHint = async () => {
    if (!currentQuestion) return;
    try {
      const hintText = await requestHint({
        question: currentQuestion,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
      }).unwrap();
      setHint(hintText);
    } catch {
      toast.error('Подсказка недоступна. Попробуйте ещё раз.');
    }
  };

  const finish = async () => {
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
      onFinished();
    } catch {
      toast.error('Не удалось сформировать отчёт. Попробуйте ещё раз.');
    }
  };

  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-text">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
          </p>
          {application && (
            <p className="mt-0.5 text-[15px] text-muted">
              Подготовка к: {application.company} — {application.position}
            </p>
          )}
        </div>
        <span className="tabular text-[13px] font-medium text-muted">
          {answers.length} / {questions.length || session.question_count} отвечено
        </span>
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answers.length}
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-[var(--ease-ios)]"
          style={{
            width: questions.length ? `${(answers.length / questions.length) * 100}%` : '0%',
          }}
        />
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center">
          {isGenerating ? (
            <>
              <Skeleton className="h-6 w-48" />
              <p className="text-[15px] text-muted">ИИ готовит вопросы с учётом темы и уровня…</p>
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
                icon={<RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />}
              >
                Сгенерировать заново
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <TranscriptItem
                key={message.id}
                message={message}
                questionNumber={
                  message.role === 'assistant' ? questions.indexOf(message.content) + 1 : 0
                }
              />
            ))}
          </div>

          {currentQuestion && (
            <section className="squircle space-y-4 rounded-card bg-surface p-5 shadow-card animate-appear">
              <div>
                <p className="text-[13px] font-semibold tracking-[0.01em] text-accent uppercase">
                  Вопрос {currentQuestionIndex + 1} из {questions.length}
                </p>
                <p className="mt-2 text-[20px] leading-snug font-semibold tracking-[-0.01em] text-text">
                  {currentQuestion}
                </p>
              </div>

              {hint && (
                <p className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-warning-strong animate-appear">
                  <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Подсказка: {hint}
                </p>
              )}

              <textarea
                value={answerDraft}
                onChange={(event) => setAnswerDraft(event.target.value)}
                aria-label="Ваш ответ на вопрос"
                placeholder="Расскажите своими словами — ИИ разберёт ответ и объяснит неточности"
                rows={6}
                disabled={isEvaluating}
                className="squircle w-full rounded-control bg-surface-muted px-3 py-2.5 text-[15px] text-text transition duration-200 ease-[var(--ease-ios)] placeholder:text-muted focus:bg-surface focus:ring-2 focus:ring-accent/60 focus:outline-none disabled:opacity-50"
              />
              {answerError && <p className="text-[13px] text-danger-strong">{answerError}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void submitAnswer()}
                  loading={isEvaluating}
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
                  disabled={isEvaluating}
                  icon={<SkipForward className="size-4" strokeWidth={1.75} aria-hidden />}
                >
                  Пропустить
                </Button>
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInterimOpen(true)}
              icon={<BarChart3 className="size-4" strokeWidth={1.75} aria-hidden />}
            >
              Промежуточный результат
            </Button>
            {isComplete ? (
              <Button size="lg" onClick={() => void finish()} loading={isFinishing}>
                Сформировать итоговый отчёт
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-strong hover:bg-danger-soft hover:text-danger-strong"
                onClick={() => setEarlyFinishOpen(true)}
              >
                Завершить досрочно
              </Button>
            )}
          </div>
        </>
      )}

      <Modal open={interimOpen} onClose={() => setInterimOpen(false)} title="Промежуточный результат">
        <InterimResults messages={messages} />
      </Modal>

      <ConfirmDialog
        open={earlyFinishOpen}
        title="Завершить тренировку досрочно?"
        message={`Отвечено ${answers.length} из ${questions.length} вопросов. По пройденной части будет сформирован итоговый отчёт.`}
        confirmLabel="Завершить"
        loading={isFinishing}
        onCancel={() => setEarlyFinishOpen(false)}
        onConfirm={() => {
          setEarlyFinishOpen(false);
          void finish();
        }}
      />
    </div>
  );
}
