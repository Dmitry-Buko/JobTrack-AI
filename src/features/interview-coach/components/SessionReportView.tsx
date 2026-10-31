import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  RotateCcw,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_MODE_LABELS,
  LANGUAGE_LABELS,
  SESSION_STATUS_LABELS,
  TOPIC_LABELS,
  type InterviewSession,
} from '@/types/interview';

import { useGetMessagesQuery } from '../api/sessionsApi';
import { EvaluationCard } from './EvaluationCard';
import { ScoreRing } from './ScoreRing';

function Section({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: 'success' | 'warning' | 'accent';
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === 'success'
      ? 'text-success-strong'
      : tone === 'warning'
        ? 'text-warning-strong'
        : 'text-accent';
  return (
    <section>
      <h4 className={`mb-2 flex items-center gap-1.5 text-[15px] font-semibold ${toneClass}`}>
        {icon}
        {title}
      </h4>
      <ul className="list-inside list-disc space-y-1 text-[15px] leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function SessionReportView({ session }: { session: InterviewSession }) {
  const { data: messages = [] } = useGetMessagesQuery(session.id);
  const report = session.report;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Отчёт тренировки</h1>
          <p className="mt-1 text-[15px] text-muted">
            {formatDateTime(session.created_at)} · {TOPIC_LABELS[session.topic]} ·{' '}
            {DIFFICULTY_LABELS[session.difficulty]} · {INTERVIEW_MODE_LABELS[session.mode]} ·{' '}
            {LANGUAGE_LABELS[session.language]} · {SESSION_STATUS_LABELS[session.status]}
          </p>
        </div>
        <Link to="/interview-coach">
          <Button variant="secondary" icon={<RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />}>
            Новая тренировка
          </Button>
        </Link>
      </div>

      {session.summary && !report && (
        <Card className="p-5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{session.summary}</p>
        </Card>
      )}

      {report && (
        <>
          {/* Итог: кольцо + компактные метрики одной строкой */}
          <Card className="flex flex-wrap items-center gap-6 p-5 sm:p-6 animate-appear">
            <ScoreRing score={report.overall_score} />
            <div className="grid flex-1 grid-cols-3 gap-4 sm:max-w-md">
              <div>
                <p className="tabular text-[24px] leading-tight font-semibold tracking-[-0.02em] text-text">
                  {report.total_questions}
                </p>
                <p className="text-[13px] text-muted">вопросов</p>
              </div>
              <div>
                <p className="tabular text-[24px] leading-tight font-semibold tracking-[-0.02em] text-text">
                  {report.answered_questions}
                </p>
                <p className="text-[13px] text-muted">ответов дано</p>
              </div>
              <div>
                <p className="tabular text-[24px] leading-tight font-semibold tracking-[-0.02em] text-text">
                  {report.skipped_questions}
                </p>
                <p className="text-[13px] text-muted">пропущено</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Разбор" />
            <CardContent className="space-y-6">
              {session.summary && (
                <p className="text-[15px] leading-relaxed text-text">{session.summary}</p>
              )}

              <Section
                icon={<CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />}
                title="Сильные стороны"
                items={report.strengths}
                tone="success"
              />
              <Section
                icon={<AlertTriangle className="size-4" strokeWidth={1.75} aria-hidden />}
                title="Темы с пробелами"
                items={report.weak_topics}
                tone="warning"
              />

              {report.weak_answers.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[15px] font-semibold text-warning-strong">Неточные ответы</h4>
                  <ul className="space-y-2">
                    {report.weak_answers.map((item, index) => (
                      <li key={index} className="rounded-control bg-surface-muted/60 p-3">
                        <p className="line-clamp-2 text-[15px] font-medium text-text">{item.question}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.issue}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Section
                icon={<BookOpenCheck className="size-4" strokeWidth={1.75} aria-hidden />}
                title="Темы для повторения"
                items={report.topics_to_review}
                tone="accent"
              />
              <Section
                icon={<ListChecks className="size-4" strokeWidth={1.75} aria-hidden />}
                title="Рекомендации"
                items={report.recommendations}
                tone="accent"
              />
              {report.conclusion && (
                <p className="flex items-start gap-2 rounded-control bg-surface-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted">
                  <Target className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {report.conclusion}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <section>
        <p className="mb-1.5 px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
          Диалог тренировки
        </p>
        {messages.length === 0 ? (
          <p className="px-1 text-[15px] text-muted">Сообщения не сохранены.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) =>
              message.role === 'assistant' ? (
                <div key={message.id} className="max-w-[85%] sm:max-w-[75%]">
                  <div className="squircle rounded-[20px] rounded-tl-[8px] bg-surface-muted px-4 py-3 shadow-card">
                    <p className="mb-0.5 text-[12px] font-medium text-muted">Вопрос</p>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                      {message.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="ml-auto max-w-[85%] space-y-3 sm:max-w-[75%]">
                  <div className="squircle ml-auto w-fit rounded-[20px] rounded-tr-[8px] bg-accent px-4 py-3">
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-accent-contrast">
                      {message.content}
                    </p>
                  </div>
                  {message.evaluation && !('skipped' in message.evaluation) && (
                    <EvaluationCard evaluation={message.evaluation} />
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <div className="pt-1">
        <Link
          to="/interview-coach"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-accent transition-colors hover:text-accent-hover"
        >
          К новой тренировке
          <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
