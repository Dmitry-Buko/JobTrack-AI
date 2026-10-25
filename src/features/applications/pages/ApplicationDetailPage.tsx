import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatSalaryRange } from '@/lib/utils';
import { INTERVIEW_MODE_LABELS, TOPIC_LABELS } from '@/types/interview';
import { WORK_FORMAT_LABELS, type ApplicationStatus } from '@/types/application';

import { useDeleteApplicationMutation, useGetApplicationQuery, useUpdateApplicationMutation } from '../api/applicationsApi';
import { JobAnalysisPanel } from '../components/JobAnalysisPanel';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusMenu } from '../components/StatusMenu';
import { useGetSessionsQuery } from '@/features/interview-coach/api/sessionsApi';

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: application, isLoading, isError, error, refetch } = useGetApplicationQuery(id);
  const { data: sessions = [] } = useGetSessionsQuery();
  const [updateApplication] = useUpdateApplicationMutation();
  const [deleteApplication, { isLoading: isDeleting }] = useDeleteApplicationMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <PageLoader />;

  if (isError || !application) {
    return (
      <ErrorState
        title="Вакансия не найдена"
        message={
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: string }).message)
            : 'Возможно, она была удалена или ссылка неверна.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  const relatedSessions = sessions.filter((session) => session.application_id === application.id);

  const handleStatusChange = (status: ApplicationStatus) => {
    void (async () => {
      try {
        await updateApplication({ id: application.id, changes: { status } }).unwrap();
        toast.success('Статус обновлён');
      } catch {
        toast.error('Не удалось изменить статус');
      }
    })();
  };

  const handleDelete = async () => {
    try {
      await deleteApplication(application.id).unwrap();
      toast.success('Вакансия удалена');
      navigate('/applications');
    } catch {
      toast.error('Не удалось удалить вакансию');
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden />
        К списку вакансий
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{application.position}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-medium text-text">{application.company}</span>
            {application.url && (
              <a
                href={application.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
              >
                Открыть вакансию
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={application.priority} />
            {application.location && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3.5" aria-hidden />
                {application.location}
                {application.work_format ? `, ${WORK_FORMAT_LABELS[application.work_format]}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusMenu value={application.status} onChange={handleStatusChange} />
          <Link to={`/applications/${application.id}/edit`}>
            <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>
              Редактировать
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger-soft"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => setConfirmOpen(true)}
          >
            Удалить
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Детали" />
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetaItem label="Зарплата" value={formatSalaryRange(application.salary_min, application.salary_max)} />
            <MetaItem
              label="Дата отклика"
              value={application.applied_at ? formatDate(application.applied_at) : '—'}
            />
            <MetaItem
              label="Следующее действие"
              value={application.next_action_at ? formatDate(application.next_action_at) : '—'}
            />
            <MetaItem label="Создана" value={formatDate(application.created_at)} />
            <MetaItem label="Обновлена" value={formatDate(application.updated_at)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Описание вакансии" />
        <CardContent>
          {application.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
              {application.description}
            </p>
          ) : (
            <p className="text-sm text-muted">Описание не добавлено.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Заметки" />
        <CardContent>
          {application.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{application.notes}</p>
          ) : (
            <p className="text-sm text-muted">Заметок пока нет.</p>
          )}
        </CardContent>
      </Card>

      <JobAnalysisPanel application={application} />

      <Card>
        <CardHeader
          title="Подготовка по этой вакансии"
          description="Тренировки, привязанные к этой вакансии"
          actions={
            <Link to={`/interview-coach?applicationId=${application.id}`}>
              <Button size="sm" icon={<GraduationCap className="size-4" aria-hidden />}>
                Начать тренировку
              </Button>
            </Link>
          }
        />
        <CardContent>
          {relatedSessions.length === 0 ? (
            <p className="text-sm text-muted">
              Пока нет тренировок по этой вакансии. Запустите AI-тренажёр — вопросы учтут требования
              вакансии.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {relatedSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    to={`/interview-coach/session/${session.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 transition-colors hover:text-accent"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="size-4 text-muted" aria-hidden />
                      {formatDate(session.created_at)} · {TOPIC_LABELS[session.topic]} ·{' '}
                      {INTERVIEW_MODE_LABELS[session.mode]}
                    </span>
                    <span className="text-sm text-muted">
                      {session.report ? `Средний балл: ${session.report.overall_score ?? '—'}` : 'Без отчёта'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить вакансию?"
        message={`«${application.position}» в компании «${application.company}» будет удалена безвозвратно. Сохранённые результаты тренировок останутся в истории.`}
        confirmLabel="Удалить"
        danger
        loading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
