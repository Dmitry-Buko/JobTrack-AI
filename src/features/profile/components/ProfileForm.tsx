import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { Profile } from '@/types/profile';

import { EXPERIENCE_LEVEL_OPTIONS } from '../lib/constants';

const profileSchema = z.object({
  full_name: z.string().trim().max(120, 'Максимум 120 символов'),
  target_role: z.string().trim().max(120, 'Максимум 120 символов'),
  experience_level: z.string().trim().max(40),
  experience_summary: z.string().trim().max(3000, 'Максимум 3000 символов'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export interface ProfileFormProps {
  profile: Profile | null;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: ProfileFormValues) => void;
}

export function ProfileForm({ profile, submitting, serverError, onSubmit }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      target_role: profile?.target_role ?? '',
      experience_level: profile?.experience_level ?? '',
      experience_summary: profile?.experience_summary ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Имя" placeholder="Как к вам обращаться" error={errors.full_name?.message} {...register('full_name')} />
        <Input
          label="Целевая должность"
          placeholder="Например, Frontend-разработчик"
          error={errors.target_role?.message}
          {...register('target_role')}
        />
      </div>

      <Select label="Желаемый уровень" {...register('experience_level')}>
        <option value="">Не указан</option>
        {EXPERIENCE_LEVEL_OPTIONS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </Select>

      <Textarea
        label="Опыт работы"
        placeholder="Кратко: стек, проекты, стаж, достижения"
        rows={5}
        error={errors.experience_summary?.message}
        {...register('experience_summary')}
      />

      {serverError && (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[15px] text-danger-strong">
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Сохранить профиль
        </Button>
      </div>
    </form>
  );
}
