import { History as HistoryIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDateTime, pluralize } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_MODES,
  INTERVIEW_TOPICS,
  LANGUAGE_LABELS,
  SESSION_STATUS_LABELS,
  TOPIC_LABELS,
  type InterviewMode,
  type InterviewTopic,
} from '@/types/interview';

import { useGetSessionsQuery } from '@/features/interview-coach/api/sessionsApi';

interface HistoryFilters {
  topic: InterviewTopic | 'all';
  mode: InterviewMode | 'all';
  dateFrom: string;
}

function SessionRow({
  session,
  companyName,
}: {
  session: import('@/types/interview').InterviewSession;
  companyName: string | null;
}) {
  return (
    <Link
      to={`/interview-coach/session/${session.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text">
          {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]} ·{' '}
          {LANGUAGE_LABELS[session.language]}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {formatDateTime(session.created_at)} · {INTERVIEW_MODE_LABELS[session.mode]} ·{' '}
          {session.question_count}{' '}
          {pluralize(session.question_count, ['вопрос', 'вопроса', 'вопросов'])}
          {companyName ? ` · ${companyName}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className="border-border bg-surface-muted text-muted">
          {SESSION_STATUS_LABELS[session.status]}
        </Badge>
        {session.report && (
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            {session.report.overall_score != null ? `${session.report.overall_score} / 5` : 'Без оценки'}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function HistoryPage() {
  const { data: sessions = [], isLoading, isError, error, refetch } = useGetSessionsQuery();
  const { data: applications = [] } = useGetApplicationsQuery();
  const [filters, setFilters] = useState<HistoryFilters>({ topic: 'all', mode: 'all', dateFrom: '' });

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const application of applications) {
      map.set(application.id, application.company);
    }
    return map;
  }, [applications]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (filters.topic !== 'all' && session.topic !== filters.topic) return false;
      if (filters.mode !== 'all' && session.mode !== filters.mode) return false;
      if (filters.dateFrom) {
        const sessionDate = session.created_at.slice(0, 10);
        if (sessionDate < filters.dateFrom) return false;
      }
      return true;
    });
  }, [sessions, filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">История тренировок</h1>
        <p className="mt-1 text-sm text-muted">
          {sessions.length}{' '}
          {pluralize(sessions.length, ['тренировка', 'тренировки', 'тренировок'])} — результаты
          сохраняются и доступны после перезагрузки
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Не удалось загрузить историю"
          message={
            typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message: string }).message)
              : undefined
          }
          onRetry={() => void refetch()}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-6" aria-hidden />}
          title="Тренировок пока не было"
          description="Запустите первую тренировку в AI-тренажёре — здесь появится история с отчётами и рекомендациями."
          action={
            <Link to="/interview-coach" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover">
              Начать тренировку
            </Link>
          }
        />
      ) : (
        <>
          <Card className="grid gap-3 p-4 sm:grid-cols-3">
            <Select
              label="Тема"
              value={filters.topic}
              onChange={(event) =>
                setFilters((current) => ({ ...current, topic: event.target.value as InterviewTopic | 'all' }))
              }
            >
              <option value="all">Все темы</option>
              {INTERVIEW_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {TOPIC_LABELS[topic]}
                </option>
              ))}
            </Select>
            <Select
              label="Формат"
              value={filters.mode}
              onChange={(event) =>
                setFilters((current) => ({ ...current, mode: event.target.value as InterviewMode | 'all' }))
              }
            >
              <option value="all">Все форматы</option>
              {INTERVIEW_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {INTERVIEW_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
            <Select
              label="Дата от"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            >
              <option value="">Любая дата</option>
              <option value={new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)}>
                Последние 7 дней
              </option>
              <option value={new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)}>
                Последние 30 дней
              </option>
            </Select>
          </Card>

          {visibleSessions.length === 0 ? (
            <EmptyState title="Ничего не найдено" description="Измените фильтры — под них не попало ни одной тренировки." />
          ) : (
            <div className="space-y-3">
              {visibleSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  companyName={session.application_id ? companyNameById.get(session.application_id) ?? null : null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
