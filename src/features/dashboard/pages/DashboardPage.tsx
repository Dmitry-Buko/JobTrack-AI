import {
  Bookmark,
  Briefcase,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  Handshake,
  MessagesSquare,
  Send,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { useGetSessionsQuery } from '@/features/interview-coach/api/sessionsApi';
import { StatusBadge } from '@/features/applications/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListGroup } from '@/components/ui/ListGroup';
import { PageLoader } from '@/components/ui/PageLoader';
import { formatDueDate, formatRelativeDate } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_MODE_LABELS,
  TOPIC_LABELS,
} from '@/types/interview';

import {
  computeDashboardStats,
  getAverageScore,
  getRecentActivity,
  getUpcomingEvents,
  getWeakTopics,
} from '../stats';

/** Компактная сводка воронки: одна строка из четырёх шагов. */
function FunnelSummary({
  saved,
  applied,
  interviews,
  offers,
}: {
  saved: number;
  applied: number;
  interviews: number;
  offers: number;
}) {
  const steps = [
    { label: 'Сохранено', value: saved, icon: Bookmark, tone: 'text-neutral' },
    { label: 'Отклики', value: applied, icon: Send, tone: 'text-accent' },
    { label: 'Собеседования', value: interviews, icon: MessagesSquare, tone: 'text-indigo' },
    { label: 'Офферы', value: offers, icon: Handshake, tone: 'text-success' },
  ];
  return (
    <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={
            index > 0
              ? 'sm:border-l sm:border-separator sm:pl-4'
              : undefined
          }
        >
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <step.icon className={`size-3.5 ${step.tone}`} strokeWidth={1.75} aria-hidden />
            {step.label}
          </p>
          <p className="tabular mt-0.5 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-text">
            {step.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const {
    data: applications = [],
    isLoading: isApplicationsLoading,
    isError: isApplicationsError,
    error: applicationsError,
    refetch: refetchApplications,
  } = useGetApplicationsQuery();
  const { data: sessions = [] } = useGetSessionsQuery();

  if (isApplicationsLoading) {
    return <PageLoader label="Собираем данные…" />;
  }

  if (isApplicationsError) {
    return (
      <ErrorState
        title="Не удалось загрузить дашборд"
        message={
          typeof applicationsError === 'object' && applicationsError !== null && 'message' in applicationsError
            ? String((applicationsError as { message: string }).message)
            : undefined
        }
        onRetry={() => void refetchApplications()}
      />
    );
  }

  const stats = computeDashboardStats(applications);
  const upcomingEvents = getUpcomingEvents(applications);
  const nextEvent = upcomingEvents[0] ?? null;
  const recentActivity = getRecentActivity(applications);
  const recentSessions = sessions.slice(0, 3);
  const weakTopics = getWeakTopics(sessions);
  const averageScore = getAverageScore(sessions);

  if (applications.length === 0 && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1>Добро пожаловать</h1>
        <EmptyState
          icon={<Briefcase className="size-8" strokeWidth={1.5} aria-hidden />}
          title="Начните вести поиск работы"
          description="Добавьте первую вакансию или сразу потренируйтесь с AI-интервьюером."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/applications/new">
                <Button icon={<Briefcase className="size-4" strokeWidth={1.75} aria-hidden />}>
                  Добавить вакансию
                </Button>
              </Link>
              <Link to="/interview-coach">
                <Button variant="secondary" icon={<GraduationCap className="size-4" strokeWidth={1.75} aria-hidden />}>
                  Начать тренировку
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <h1>Дашборд</h1>

      {/* Главный блок: «Сегодня» + сводка воронки */}
      <section className="squircle rounded-card bg-surface p-5 shadow-card animate-appear sm:p-6">
        <p className="text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Сегодня</p>

        {nextEvent ? (
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[22px] leading-tight font-semibold tracking-[-0.01em] text-text">
                {nextEvent.application.company} — {nextEvent.application.position}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[15px] text-warning-strong">
                <CalendarClock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {formatRelativeDate(nextEvent.date)}
                {upcomingEvents.length > 1 && (
                  <span className="text-muted">
                    · ещё {upcomingEvents.length - 1}{' '}
                    {upcomingEvents.length - 1 === 1 ? 'событие' : upcomingEvents.length - 1 < 5 ? 'события' : 'событий'}
                  </span>
                )}
              </p>
            </div>
            <Link to={`/applications/${nextEvent.application.id}`}>
              <Button variant="ghost" size="sm">
                Открыть вакансию
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3">
            <p className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-text">
              Запланированных действий нет
            </p>
            <Link to="/applications/new">
              <Button variant="ghost" size="sm">
                Добавить вакансию
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-6 border-t border-separator pt-5">
          <FunnelSummary
            saved={stats.totalApplications}
            applied={stats.appliedCount}
            interviews={stats.upcomingInterviews}
            offers={stats.offersCount}
          />
        </div>
      </section>

      {/* Inset-группы. min-w-0 на секциях обязателен: без него строки с truncate
          раздувают грид-колонку шире экрана и появляется горизонтальный скролл */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
              Последние тренировки
              {averageScore != null && (
                <span className="tabular ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold tracking-normal text-accent normal-case">
                  средний {averageScore} из 5
                </span>
              )}
            </p>
            <Link
              to="/interview-coach"
              className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Тренироваться
            </Link>
          </div>
          <ListGroup>
            {recentSessions.length === 0 ? (
              <p className="px-4 py-4 text-[15px] text-muted">
                Тренировок ещё не было — AI-интервьюер уже ждёт.
              </p>
            ) : (
              recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/interview-coach/session/${session.id}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-text">
                      {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {INTERVIEW_MODE_LABELS[session.mode]}
                    </span>
                  </span>
                  {session.report?.overall_score != null ? (
                    <span className="tabular shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-[13px] font-semibold text-accent">
                      {session.report.overall_score} из 5
                    </span>
                  ) : null}
                  <ChevronRight className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
                </Link>
              ))
            )}
          </ListGroup>
        </section>

        <section className="min-w-0">
          <p className="mb-1.5 px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
            Что повторить
          </p>
          <ListGroup>
            {weakTopics.length === 0 ? (
              <p className="px-4 py-4 text-[15px] text-muted">
                Здесь появятся темы для повторения после первых тренировок с отчётом.
              </p>
            ) : (
              weakTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-[15px] text-text">
                    <span className="line-clamp-2">{topic.topic}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-warning-strong">
                    <TrendingUp className="size-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="tabular">{topic.count}</span>
                  </span>
                </div>
              ))
            )}
          </ListGroup>
        </section>

        <section className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
              Вакансии в работе
            </p>
            <Link
              to="/applications"
              className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Все вакансии
            </Link>
          </div>
          <ListGroup>
            {recentActivity.length === 0 ? (
              <p className="px-4 py-4 text-[15px] text-muted">Пока нет вакансий.</p>
            ) : (
              recentActivity.map((application) => (
                <Link
                  key={application.id}
                  to={`/applications/${application.id}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-text">
                      {application.position}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {application.company}
                      {application.next_action_at && (
                        <span className="text-warning-strong"> · {formatDueDate(application.next_action_at)}</span>
                      )}
                    </span>
                  </span>
                  <StatusBadge status={application.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
                </Link>
              ))
            )}
          </ListGroup>
        </section>
      </div>
    </div>
  );
}
