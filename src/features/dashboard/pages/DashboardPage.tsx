import {
  Briefcase,
  CalendarClock,
  CalendarCheck,
  GraduationCap,
  Handshake,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { useGetSessionsQuery } from '@/features/interview-coach/api/sessionsApi';
import { StatusBadge } from '@/features/applications/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { formatDate, formatRelativeDate } from '@/lib/utils';
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-text">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </Card>
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
  const recentActivity = getRecentActivity(applications);
  const recentSessions = sessions.slice(0, 3);
  const weakTopics = getWeakTopics(sessions);
  const averageScore = getAverageScore(sessions);

  if (applications.length === 0 && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать в JobTrack AI</h1>
        <EmptyState
          icon={<Sparkles className="size-6" aria-hidden />}
          title="Начните вести поиск работы"
          description="Добавьте первую вакансию, чтобы отслеживать отклики и собеседования, или сразу потренируйтесь с AI-интервьюером."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/applications/new">
                <Button icon={<Briefcase className="size-4" aria-hidden />}>Добавить вакансию</Button>
              </Link>
              <Link to="/interview-coach">
                <Button variant="secondary" icon={<GraduationCap className="size-4" aria-hidden />}>
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Сохранённых вакансий" value={stats.totalApplications} icon={<Briefcase className="size-5" aria-hidden />} />
        <StatCard label="Отправленных откликов" value={stats.appliedCount} icon={<Send className="size-5" aria-hidden />} />
        <StatCard label="Предстоящих собеседований" value={stats.upcomingInterviews} icon={<CalendarCheck className="size-5" aria-hidden />} />
        <StatCard label="Полученных офферов" value={stats.offersCount} icon={<Handshake className="size-5" aria-hidden />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ближайшие события" description="Даты следующих действий и собеседований" />
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted">Запланированных событий нет.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingEvents.map(({ application, date }) => (
                  <li key={application.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      to={`/applications/${application.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-text hover:text-accent"
                    >
                      {application.company} — {application.position}
                    </Link>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-warning">
                      <CalendarClock className="size-3.5" aria-hidden />
                      {formatRelativeDate(date)}, {formatDate(date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Последние действия" description="Обновления по вакансиям" />
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted">Пока нет вакансий.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentActivity.map((application) => (
                  <li key={application.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      to={`/applications/${application.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-text hover:text-accent"
                    >
                      {application.company} — {application.position}
                    </Link>
                    <StatusBadge status={application.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Последние тренировки"
            description={averageScore != null ? `Средний балл по всем отчётам: ${averageScore} / 5` : 'Готовые отчёты появятся после первых тренировок'}
            actions={
              <Link to="/interview-coach">
                <Button size="sm" variant="secondary" icon={<GraduationCap className="size-4" aria-hidden />}>
                  Тренироваться
                </Button>
              </Link>
            }
          />
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted">
                Тренировок ещё не было — AI-интервьюер ждёт вас в разделе «AI-тренажёр».
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      to={`/interview-coach/session/${session.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:text-accent"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]} ·{' '}
                        {INTERVIEW_MODE_LABELS[session.mode]}
                      </span>
                      <span className="shrink-0 text-sm text-muted">
                        {session.report?.overall_score != null ? `${session.report.overall_score} / 5` : formatDate(session.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Знания и повторение" description="Слабые темы по итогам тренировок" />
          <CardContent>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-muted">
                Здесь появятся темы для повторения, как только вы завершите первые тренировки с
                отчётом.
              </p>
            ) : (
              <ul className="space-y-2">
                {weakTopics.map((topic) => (
                  <li key={topic.topic} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{topic.topic}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-warning">
                      <TrendingUp className="size-3.5" aria-hidden />
                      {topic.count}{' '}
                      {topic.count === 1 ? 'упоминание' : topic.count < 5 ? 'упоминания' : 'упоминаний'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
