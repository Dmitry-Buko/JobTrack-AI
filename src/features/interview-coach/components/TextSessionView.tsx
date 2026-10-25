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
import { Card } from '@/components/ui/Card';
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

const SKIP_ANSWER_TEXT = '(Вопрос пропущен)';

function TranscriptItem({ message, questionNumber }: { message: InterviewMessage; questionNumber: number }) {
  if (message.role === 'assistant') {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent-soft/60 p-4">
        <p className="mb-1 text-xs font-medium text-accent">Вопрос {questionNumber}</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{message.content}</p>
      </div>
    );
  }

  const evaluation = message.evaluation;
  const isSkipped = message.content === SKIP_ANSWER_TEXT;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-xs font-medium text-muted">Ваш ответ</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
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
    <div className="space-y-3">
      {answered.length === 0 && <p className="text-sm text-muted">Пока нет ответов на вопросы.</p>}
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
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-text">
              Ответ {index + 1}
              {message.content === SKIP_ANSWER_TEXT ? ' (пропущен)' : ''}
            </span>
            <span className="text-sm font-medium text-muted">Средняя: {average}</span>
          </div>
        );
      })}
      <p className="text-xs text-muted">
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
          messages: result.map((content, index) => ({
            session_id: session.id,
            role: 'assistant' as const,
            content,
            turn_index: index,
            evaluation: null,
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
          </h1>
          {application && (
            <p className="mt-0.5 text-sm text-muted">
              Подготовка к: {application.company} — {application.position}
            </p>
          )}
        </div>
        <span className="text-sm text-muted">
          {answers.length} / {questions.length || session.question_count} вопросов отвечено
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answers.length}
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: questions.length ? `${(answers.length / questions.length) * 100}%` : '0%',
          }}
        />
      </div>

      {questions.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          {isGenerating ? (
            <>
              <Skeleton className="h-6 w-48" />
              <p className="text-sm text-muted">ИИ готовит вопросы с учётом темы и уровня…</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Вопросы не сгенерированы.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  generationStarted.current = false;
                  void refetch();
                }}
                icon={<RotateCcw className="size-4" aria-hidden />}
              >
                Сгенерировать заново
              </Button>
            </>
          )}
        </Card>
      ) : (
        <>
          <div className="space-y-5">
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
            <Card className="space-y-4 p-5">
              <div className="rounded-xl border border-accent/30 bg-accent-soft/60 p-4">
                <p className="mb-1 text-xs font-medium text-accent">
                  Вопрос {currentQuestionIndex + 1} из {questions.length}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {currentQuestion}
                </p>
              </div>

              {hint && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
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
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {answerError && <p className="text-sm text-danger">{answerError}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void submitAnswer()}
                  loading={isEvaluating}
                  icon={<SendHorizontal className="size-4" aria-hidden />}
                >
                  Ответить
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void askHint()}
                  loading={isHintLoading}
                  icon={<Lightbulb className="size-4" aria-hidden />}
                >
                  Подсказка
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void skipQuestion()}
                  disabled={isEvaluating}
                  icon={<SkipForward className="size-4" aria-hidden />}
                >
                  Пропустить
                </Button>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInterimOpen(true)}
              icon={<BarChart3 className="size-4" aria-hidden />}
            >
              Промежуточный результат
            </Button>
            {isComplete ? (
              <Button onClick={() => void finish()} loading={isFinishing}>
                Сформировать итоговый отчёт
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft"
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
