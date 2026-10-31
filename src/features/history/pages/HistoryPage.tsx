import { ChevronRight, History as HistoryIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { ListGroup } from '@/components/ui/ListGroup';
import { Button } from '@/components/ui/Button';
import { formatDateTime, pluralize } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_MODES,
  INTERVIEW_TOPICS,
  SESSION_STATUS_LABELS,
  TOPIC_LABELS,
  type InterviewMode,
  type InterviewSession,
  type InterviewTopic,
} from '@/types/interview';
import { subtopicLabel } from '@/features/interview-coach/lib/subtopics';

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
  session: InterviewSession;
  companyName: string | null;
}) {
  // Формат: тест / старый текстовый / голосовой; для теста — выбранные темы.
  const formatLabel =
    session.format === 'test' ? 'Тест' : INTERVIEW_MODE_LABELS[session.mode];
  const topicsLine =
    session.format === 'test' && session.selected_topics && session.selected_topics.length > 0
      ? session.selected_topics.map((key) => subtopicLabel(key)).join(', ')
      : null;

  return (
    <Link
      to={`/interview-coach/session/${session.id}`}
      className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text">
          {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {formatDateTime(session.created_at)} · {formatLabel}
          {companyName ? ` · ${companyName}` : ''}
        </p>
        {topicsLine && (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-subtle" title={topicsLine}>
            {topicsLine}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {session.report && (
          <Badge className="tabular bg-accent-soft text-accent">
            {session.report.overall_score != null ? `${session.report.overall_score} из 5` : 'Без оценки'}
          </Badge>
        )}
        <Badge className="hidden bg-neutral-soft text-neutral-strong sm:inline-flex">
          {SESSION_STATUS_LABELS[session.status]}
        </Badge>
        <ChevronRight className="size-4 text-muted" strokeWidth={1.75} aria-hidden />
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
        <h1>История</h1>
        <p className="mt-1 text-[15px] text-muted">
          {sessions.length}{' '}
          {pluralize(sessions.length, ['тренировка', 'тренировки', 'тренировок'])}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
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
          icon={<HistoryIcon className="size-8" strokeWidth={1.5} aria-hidden />}
          title="Тренировок пока не было"
          description="Запустите первую тренировку — здесь появятся отчёты и рекомендации."
          action={
            <Link to="/interview-coach">
              <Button>Начать тренировку</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="squircle grid gap-3 rounded-card bg-surface p-4 shadow-card sm:grid-cols-3">
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
          </div>

          {visibleSessions.length === 0 ? (
            <EmptyState title="Ничего не найдено" description="Попробуйте изменить фильтры." />
          ) : (
            <ListGroup className="animate-appear">
              {visibleSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  companyName={session.application_id ? companyNameById.get(session.application_id) ?? null : null}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
