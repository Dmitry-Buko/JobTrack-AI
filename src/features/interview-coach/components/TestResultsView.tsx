import { BookOpenCheck, CheckCircle2, ChevronDown, Home, RotateCcw, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useGetMessagesQuery } from '../api/sessionsApi';
import { computeOverallScore } from '@/features/ai/lib/report';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListGroup } from '@/components/ui/ListGroup';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AnswerEvaluation, InterviewMessage, InterviewSession } from '@/types/interview';
import { DIFFICULTY_LABELS } from '@/types/interview';
import { SKIP_ANSWER_TEXT } from '../lib/constants';
import { WEAK_SUBTOPIC_THRESHOLD, subtopicLabel } from '../lib/subtopics';
import { evaluationRetry } from '../testSession/testSessionSlice';
import { evaluationProgress } from '../testSession/evaluationQueue';
import { useEvaluationWorker } from '../testSession/useEvaluationWorker';
import { EvaluationCard } from './EvaluationCard';
import { ScoreRing } from './ScoreRing';

interface QuestionPair {
  index: number;
  question: InterviewMessage;
  answer: InterviewMessage | null;
}

type PairTone = 'success' | 'warning' | 'danger' | 'neutral';

function averageScore(evaluation: AnswerEvaluation | null): number | null {
  if (!evaluation) return null;
  const numeric = Object.values(evaluation.scores)
    .map((score) => ('score' in score ? score.score : null))
    .filter((score): score is 1 | 2 | 3 | 4 | 5 => score !== null);
  if (numeric.length === 0) return null;
  return Math.round((numeric.reduce((sum, score) => sum + score, 0) / numeric.length) * 10) / 10;
}

/** Метка результата строки: Верно / Частично / Есть ошибки / Пропущен и т.д. */
function pairStatus(
  pair: QuestionPair,
  failedIds: Set<string>,
): { label: string; tone: PairTone; score: number | null } {
  if (!pair.answer) return { label: 'Без ответа', tone: 'neutral', score: null };
  if (pair.answer.content === SKIP_ANSWER_TEXT) return { label: 'Пропущен', tone: 'neutral', score: null };
  if (failedIds.has(pair.answer.id)) {
    return { label: 'Не удалось оценить', tone: 'warning', score: null };
  }
  const evaluation = pair.answer.evaluation;
  if (!evaluation || 'skipped' in evaluation) return { label: 'Оцениваем…', tone: 'neutral', score: null };
  const average = averageScore(evaluation);
  if (average == null) return { label: 'Недостаточно данных', tone: 'neutral', score: null };
  if (average >= 4) return { label: 'Верно', tone: 'success', score: average };
  if (average >= 3) return { label: 'Частично', tone: 'warning', score: average };
  return { label: 'Есть ошибки', tone: 'danger', score: average };
}

const TONE_CLASSES: Record<PairTone, string> = {
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
  neutral: 'bg-neutral-soft text-neutral-strong',
};

/** «12 мин» / «1 мин 40 с» — по разнице завершения и старта. */
function formatDuration(fromIso: string, toIso: string): string {
  return formatDurationMs(Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime()));
}

function formatDurationMs(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  if (minutes === 0) return `${seconds} с`;
  if (seconds === 0 || minutes >= 10) return `${minutes} мин`;
  return `${minutes} мин ${seconds} с`;
}

/**
 * Среднее время на ответ: от предыдущего события (ответа или старта сессии)
 * до created_at ответа. Выбросы больше 30 минут не учитываем.
 */
function computeAverageAnswerMs(
  session: Pick<InterviewSession, 'created_at'>,
  messages: Array<Pick<InterviewMessage, 'role' | 'created_at'>>,
): number | null {
  const answers = messages.filter((message) => message.role === 'user');
  if (answers.length === 0) return null;
  let total = 0;
  let count = 0;
  answers.forEach((answer, index) => {
    const from =
      index === 0
        ? new Date(session.created_at).getTime()
        : new Date(answers[index - 1].created_at).getTime();
    const spent = new Date(answer.created_at).getTime() - from;
    if (spent >= 0 && spent < 30 * 60_000) {
      total += spent;
      count += 1;
    }
  });
  return count > 0 ? Math.round(total / count) : null;
}

/** Слабые подтемы: средний балл ниже порога. */
function computeWeakSubtopics(pairs: QuestionPair[]): string[] {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const pair of pairs) {
    if (!pair.answer) continue;
    const evaluation = pair.answer.evaluation;
    if (!evaluation || 'skipped' in evaluation) continue;
    const average = averageScore(evaluation);
    if (average == null) continue;
    const key = pair.question.subtopic;
    if (!key) continue;
    const current = sums.get(key) ?? { sum: 0, count: 0 };
    sums.set(key, { sum: current.sum + average, count: current.count + 1 });
  }
  return [...sums.entries()]
    .filter(([, { sum, count }]) => sum / count < WEAK_SUBTOPIC_THRESHOLD)
    .map(([key]) => key);
}

export function TestResultsView({ session }: { session: InterviewSession }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const evaluations = useAppSelector((state) => state.testSession.evaluations);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: messages = [] } = useGetMessagesQuery(session.id);
  useEvaluationWorker(session);

  const pairs = useMemo<QuestionPair[]>(() => {
    const questions = messages.filter((message) => message.role === 'assistant');
    const answers = messages.filter((message) => message.role === 'user');
    return questions.map((question, index) => ({
      index,
      question,
      answer: answers[index] ?? null,
    }));
  }, [messages]);

  const failedIds = useMemo(
    () =>
      new Set(
        Object.values(evaluations)
          .filter((entry) => entry.status === 'failed')
          .map((entry) => entry.userMessageId),
      ),
    [evaluations],
  );

  const overallScore = computeOverallScore(messages);
  const answeredPairs = pairs.filter((pair) => pair.answer !== null);
  const progress = evaluationProgress(evaluations, answeredPairs.length);
  const weakSubtopics = computeWeakSubtopics(pairs);
  const percent = overallScore != null ? Math.round((overallScore / 5) * 100) : null;
  const duration = session.completed_at ? formatDuration(session.created_at, session.completed_at) : null;
  const averageAnswerMs = computeAverageAnswerMs(session, messages);
  const allExpanded = expanded.size === pairs.length && pairs.length > 0;

  const toggleRow = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const repeatSetup = (subtopics: string[]) => ({
    subtopics,
    difficulty: session.difficulty,
    questionCount: session.question_count,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1>Результаты теста</h1>
        <p className="mt-1 text-[15px] text-muted">
          {DIFFICULTY_LABELS[session.difficulty]}
          {duration ? ` · ${duration}` : ''}
          {averageAnswerMs != null ? ` · в среднем ${formatDurationMs(averageAnswerMs)} на ответ` : ''}
        </p>
      </div>

      {/* Сводка: балл, процент, темы */}
      <Card className="flex flex-wrap items-center gap-6 p-5 sm:p-6 animate-appear">
        <ScoreRing score={overallScore} />
        <div className="min-w-0 flex-1">
          <p className="tabular text-[34px] leading-none font-bold tracking-[-0.02em] text-text">
            {percent != null ? `${percent}%` : '—'}
          </p>
          <p className="mt-1 text-[15px] text-muted">Средний балл {overallScore ?? '—'} из 5</p>
          {session.selected_topics && session.selected_topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {session.selected_topics.map((key) => (
                <Badge key={key} className="bg-accent-soft text-accent">
                  {subtopicLabel(key)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Резюме AI */}
      {session.summary && (
        <Card className="p-5">
          <p className="text-[15px] leading-relaxed text-text">{session.summary}</p>
        </Card>
      )}

      {/* Сильные стороны / что повторить */}
      {(session.report?.strengths?.length || session.report?.topics_to_review?.length) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {session.report && session.report.strengths.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-success-strong">
                <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />
                Сильные стороны
              </h2>
              <ul className="list-inside list-disc space-y-1 text-[15px] leading-relaxed text-muted">
                {session.report.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          )}
          {session.report && session.report.topics_to_review.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-accent">
                <BookOpenCheck className="size-4" strokeWidth={1.75} aria-hidden />
                Что повторить
              </h2>
              <ul className="list-inside list-disc space-y-1 text-[15px] leading-relaxed text-muted">
                {session.report.topics_to_review.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Прогресс фоновых оценок */}
      {progress.evaluated < progress.total && (
        <p className="tabular px-1 text-[13px] font-medium text-muted" aria-live="polite">
          Оценено {progress.evaluated} из {progress.total} — результаты дополняются по мере оценки.
        </p>
      )}

      {/* Список вопросов: аккордеон */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
          Вопросы теста
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setExpanded(allExpanded ? new Set() : new Set(pairs.map((pair) => pair.question.id)))
          }
        >
          {allExpanded ? 'Свернуть все' : 'Развернуть все'}
        </Button>
      </div>

      <ListGroup>
        {pairs.map((pair) => {
          const status = pairStatus(pair, failedIds);
          const key = pair.question.id;
          const isOpen = expanded.has(key);
          const evaluation =
            pair.answer?.evaluation && !('skipped' in pair.answer.evaluation)
              ? pair.answer.evaluation
              : null;
          const failedEntry = pair.answer ? evaluations[pair.answer.id] : undefined;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => toggleRow(key)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <span className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="tabular mt-0.5 shrink-0 text-[13px] font-semibold text-muted">
                    {pair.index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[15px] leading-snug text-text">
                      {pair.question.content}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      {pair.question.subtopic && <span>{subtopicLabel(pair.question.subtopic)}</span>}
                      {pair.question.hint_used && (
                        <span className="text-warning-strong">· подсказка</span>
                      )}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {status.score != null && (
                    <span className="tabular text-[13px] font-semibold text-muted">
                      {status.score.toString().replace('.', ',')}
                    </span>
                  )}
                  <Badge className={TONE_CLASSES[status.tone]}>{status.label}</Badge>
                  <ChevronDown
                    className={`size-4 text-muted transition-transform duration-200 ease-[var(--ease-ios)] ${isOpen ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-separator px-4 py-4 animate-appear">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                    {pair.question.content}
                  </p>
                  <div>
                    <p className="mb-1 text-[13px] font-medium text-muted">Ваш ответ</p>
                    <div className="squircle rounded-[16px] bg-surface-muted px-4 py-3">
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                        {pair.answer
                          ? pair.answer.content === SKIP_ANSWER_TEXT
                            ? '— Пропущено —'
                            : pair.answer.content
                          : '— Ответа не было —'}
                      </p>
                    </div>
                  </div>

                  {evaluation ? (
                    <EvaluationCard evaluation={evaluation} />
                  ) : failedEntry?.status === 'failed' ? (
                    <div className="squircle flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-surface-muted/70 p-4">
                      <p className="text-[13px] leading-relaxed text-warning-strong">
                        {failedEntry.error ?? 'Не удалось оценить ответ.'}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />}
                        onClick={() => dispatch(evaluationRetry(pair.answer!.id))}
                      >
                        Повторить
                      </Button>
                    </div>
                  ) : pair.answer ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-16" />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </ListGroup>

      {/* Действия */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {session.selected_topics && session.selected_topics.length > 0 && (
          <Button onClick={() => navigate('/interview-coach', { state: { repeatSetup: repeatSetup(session.selected_topics!) } })}>
            Пройти ещё раз
          </Button>
        )}
        {weakSubtopics.length > 0 && (
          <Button
            variant="secondary"
            icon={<Target className="size-4" strokeWidth={1.75} aria-hidden />}
            onClick={() => navigate('/interview-coach', { state: { repeatSetup: repeatSetup(weakSubtopics) } })}
          >
            Повторить слабые темы
          </Button>
        )}
        <Link to="/dashboard">
          <Button variant="ghost" icon={<Home className="size-4" strokeWidth={1.75} aria-hidden />}>
            Вернуться на дашборд
          </Button>
        </Link>
      </div>
    </div>
  );
}
