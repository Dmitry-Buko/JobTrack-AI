import { useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/errors';

import { useGetProfileQuery, useGetSkillsQuery, useUpdateProfileMutation } from '../api/profileApi';
import { ProfileForm } from '../components/ProfileForm';
import { SkillsEditor } from '../components/SkillsEditor';

export function ProfilePage() {
  const toast = useToast();
  const { data: profile, isLoading, isError, error, refetch } = useGetProfileQuery();
  const { data: skills = [], isLoading: isSkillsLoading } = useGetSkillsQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  if (isError) {
    return (
      <ErrorState
        title="Не удалось загрузить профиль"
        message={typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: string }).message) : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1>Профиль</h1>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <Card>
          <CardHeader
            title="Основная информация"
            description="Помогает ИИ подстраивать тренировки и анализ вакансий"
          />
          <CardContent>
            <ProfileForm
              profile={profile ?? null}
              submitting={isUpdating}
              serverError={serverError}
              onSubmit={(values) => {
                setServerError(null);
                void updateProfile(values)
                  .unwrap()
                  .then(() => toast.success('Профиль сохранён'))
                  .catch((updateError) =>
                    setServerError(
                      getErrorMessage(updateError, 'Не удалось сохранить профиль.'),
                    ),
                  );
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader title="Навыки" description="Технологии и уровень владения" />
        <CardContent>
          {isSkillsLoading ? <Skeleton className="h-40" /> : <SkillsEditor skills={skills} />}
        </CardContent>
      </Card>

      {isLoading && <PageLoader label="Загружаем профиль…" />}
    </div>
  );
}
