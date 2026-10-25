import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
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
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-accent';
  return (
    <section>
      <h4 className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${toneClass}`}>
        {icon}
        {title}
      </h4>
      <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-muted">
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
          <h1 className="text-2xl font-semibold tracking-tight">Итоговый отчёт тренировки</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDateTime(session.created_at)} · {TOPIC_LABELS[session.topic]} ·{' '}
            {DIFFICULTY_LABELS[session.difficulty]} · {INTERVIEW_MODE_LABELS[session.mode]} ·{' '}
            {LANGUAGE_LABELS[session.language]} · {SESSION_STATUS_LABELS[session.status]}
          </p>
        </div>
        <Link to="/interview-coach">
          <Button variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />}>
            Новая тренировка
          </Button>
        </Link>
      </div>

      {session.summary && !report && (
        <Card className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{session.summary}</p>
        </Card>
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="flex flex-col items-center justify-center p-5">
              <p className="text-3xl font-semibold text-text">
                {report.overall_score ?? '—'}
                <span className="text-base text-muted"> / 5</span>
              </p>
              <p className="mt-1 text-xs text-muted">Средний балл</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-5">
              <p className="text-3xl font-semibold text-text">{report.total_questions}</p>
              <p className="mt-1 text-xs text-muted">Вопросов</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-5">
              <p className="text-3xl font-semibold text-text">{report.answered_questions}</p>
              <p className="mt-1 text-xs text-muted">Ответов дано</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-5">
              <p className="text-3xl font-semibold text-text">{report.skipped_questions}</p>
              <p className="mt-1 text-xs text-muted">Пропущено</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Разбор" />
            <CardContent className="space-y-6">
              {session.summary && (
                <p className="text-sm leading-relaxed text-text">{session.summary}</p>
              )}

              <Section
                icon={<CheckCircle2 className="size-4" aria-hidden />}
                title="Сильные стороны"
                items={report.strengths}
                tone="success"
              />
              <Section
                icon={<AlertTriangle className="size-4" aria-hidden />}
                title="Темы с пробелами"
                items={report.weak_topics}
                tone="warning"
              />

              {report.weak_answers.length > 0 && (
                <section>
                  <h4 className="mb-2 text-sm font-medium text-warning">Неточные ответы</h4>
                  <ul className="space-y-2">
                    {report.weak_answers.map((item, index) => (
                      <li key={index} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-text">{item.question}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{item.issue}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Section
                icon={<BookOpenCheck className="size-4" aria-hidden />}
                title="Темы для повторения"
                items={report.topics_to_review}
                tone="accent"
              />
              <Section
                icon={<ListChecks className="size-4" aria-hidden />}
                title="Рекомендации"
                items={report.recommendations}
                tone="accent"
              />
              {report.conclusion && (
                <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-muted">
                  <Target className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {report.conclusion}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader title="Диалог тренировки" />
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Сообщения не сохранены.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) =>
                message.role === 'assistant' ? (
                  <div key={message.id} className="rounded-xl border border-accent/30 bg-accent-soft/60 p-4">
                    <p className="mb-1 text-xs font-medium text-accent">Вопрос</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div key={message.id} className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface p-4">
                      <p className="mb-1 text-xs font-medium text-muted">Ваш ответ</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
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
        </CardContent>
      </Card>
    </div>
  );
}
