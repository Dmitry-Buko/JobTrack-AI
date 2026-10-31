import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/errors';

import { useCreateApplicationMutation, useGetApplicationQuery, useUpdateApplicationMutation } from '../api/applicationsApi';
import { ApplicationForm } from '../components/ApplicationForm';
import { formValuesToInsert } from '../lib/schema';

export function ApplicationFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: application, isLoading, isError, refetch } = useGetApplicationQuery(id ?? '', { skip: mode === 'create' || !id });
  const [createApplication, { isLoading: isCreating }] = useCreateApplicationMutation();
  const [updateApplication, { isLoading: isUpdating }] = useUpdateApplicationMutation();

  const submitting = isCreating || isUpdating;

  if (mode === 'edit') {
    if (isLoading) return <PageLoader />;
    if (isError || !application) {
      return (
        <ErrorState
          title="Вакансия не найдена"
          message="Возможно, она была удалена или ссылка неверна."
          onRetry={() => void refetch()}
        />
      );
    }
  }

  const handleSubmit = async (values: Parameters<typeof formValuesToInsert>[0]) => {
    setServerError(null);
    try {
      if (mode === 'create') {
        const created = await createApplication(formValuesToInsert(values)).unwrap();
        toast.success('Вакансия создана');
        navigate(`/applications/${created.id}`);
      } else if (id) {
        await updateApplication({ id, changes: formValuesToInsert(values) }).unwrap();
        toast.success('Изменения сохранены');
        navigate(`/applications/${id}`);
      }
    } catch (error) {
      setServerError(getErrorMessage(error, 'Не удалось сохранить вакансию.'));
    }
  };

  return (
    <div className="space-y-4">
      <Link
        to={mode === 'edit' && id ? `/applications/${id}` : '/applications'}
        className="inline-flex items-center gap-1.5 text-[15px] text-accent transition-colors hover:text-accent-hover"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        {mode === 'edit' ? 'К вакансии' : 'К списку вакансий'}
      </Link>

      <Card className="p-5 sm:p-6">
        <h1 className="mb-6">
          {mode === 'create' ? 'Новая вакансия' : 'Редактирование вакансии'}
        </h1>
        <ApplicationForm
          mode={mode}
          initial={mode === 'edit' ? application ?? null : null}
          submitting={submitting}
          serverError={serverError}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => navigate(mode === 'edit' && id ? `/applications/${id}` : '/applications')}
        />
      </Card>
    </div>
  );
}
