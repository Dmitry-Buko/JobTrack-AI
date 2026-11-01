import { Briefcase } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { pluralize } from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types/application';

import { useGetApplicationsQuery, useUpdateApplicationMutation } from '../api/applicationsApi';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationsToolbar, type ApplicationsView } from '../components/ApplicationsToolbar';
import { KanbanBoard } from '../components/KanbanBoard';
import { DEFAULT_FILTERS, filterApplications, sortApplications, type ApplicationFilters, type ApplicationSort } from '../lib/filters';

function ApplicationsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
  );
}

export function ApplicationsPage() {
  const { data: applications = [], isLoading, isError, error, refetch } = useGetApplicationsQuery();
  const [updateApplication] = useUpdateApplicationMutation();
  const toast = useToast();

  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<ApplicationSort>('updated_desc');
  const [view, setView] = useState<ApplicationsView>('list');

  const visibleApplications = useMemo(
    () => sortApplications(filterApplications(applications, filters), sort),
    [applications, filters, sort],
  );

  const handleStatusChange = async (application: Application, status: ApplicationStatus) => {
    try {
      await updateApplication({ id: application.id, changes: { status } }).unwrap();
      toast.success('Статус обновлён');
    } catch {
      toast.error('Не удалось изменить статус. Попробуйте ещё раз.');
    }
  };

  const hasFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.due !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Вакансии</h1>
          <p className="mt-1 text-[15px] text-muted">
            {applications.length}{' '}
            {pluralize(applications.length, ['вакансия', 'вакансии', 'вакансий'])}
          </p>
        </div>
      </div>

      {isLoading ? (
        <ApplicationsSkeleton />
      ) : isError ? (
        <ErrorState
          title="Не удалось загрузить вакансии"
          message={typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: string }).message) : undefined}
          onRetry={() => void refetch()}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-6" aria-hidden />}
          title="Пока нет сохранённых вакансий"
          description="Добавьте первую вакансию, чтобы отслеживать отклики, собеседования и офферы в одном месте."
          action={
            <Link to="/applications/new">
              <Button>Добавить первую вакансию</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ApplicationsToolbar
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
          />

          {visibleApplications.length === 0 ? (
            <EmptyState
              title="Ничего не найдено"
              description={
                hasFilters
                  ? 'Под выбранные фильтры не подходит ни одна вакансия. Измените условия поиска.'
                  : undefined
              }
            />
          ) : view === 'list' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onStatusChange={(status) => void handleStatusChange(application, status)}
                />
              ))}
            </div>
          ) : (
            <KanbanBoard
              applications={visibleApplications}
              onStatusChange={(application, status) => void handleStatusChange(application, status)}
            />
          )}
        </>
      )}
    </div>
  );
}
