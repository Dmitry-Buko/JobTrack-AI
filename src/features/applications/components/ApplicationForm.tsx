import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  PRIORITIES,
  PRIORITY_LABELS,
  WORK_FORMATS,
  WORK_FORMAT_LABELS,
  type Application,
} from '@/types/application';

import {
  applicationFormSchema,
  applicationToFormValues,
  EMPTY_APPLICATION_FORM,
  type ApplicationFormValues,
} from '../lib/schema';

export interface ApplicationFormProps {
  mode: 'create' | 'edit';
  initial?: Application | null;
  submitting?: boolean;
  serverError?: string | null;
  onSubmit: (values: ApplicationFormValues) => void;
  onCancel: () => void;
}

export function ApplicationForm({
  mode,
  initial = null,
  submitting = false,
  serverError = null,
  onSubmit,
  onCancel,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: initial ? applicationToFormValues(initial) : EMPTY_APPLICATION_FORM,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Компания *"
          placeholder="Например, Яндекс"
          error={errors.company?.message}
          {...register('company')}
        />
        <Input
          label="Должность *"
          placeholder="Например, Frontend-разработчик"
          error={errors.position?.message}
          {...register('position')}
        />
      </div>

      <Input
        label="Ссылка на вакансию"
        placeholder="https://..."
        error={errors.url?.message}
        {...register('url')}
      />

      <Textarea
        label="Описание вакансии"
        placeholder="Вставьте текст вакансии — он используется для AI-анализа требований и подготовки к собеседованию"
        rows={6}
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Локация"
          placeholder="Город или часовой пояс"
          error={errors.location?.message}
          {...register('location')}
        />
        <Select label="Формат работы" {...register('work_format')}>
          <option value="">Не указан</option>
          {WORK_FORMATS.map((format) => (
            <option key={format} value={format}>
              {WORK_FORMAT_LABELS[format]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Зарплата от"
          type="number"
          min="0"
          step="1000"
          placeholder="100000"
          error={errors.salary_min?.message}
          {...register('salary_min')}
        />
        <Input
          label="Зарплата до"
          type="number"
          min="0"
          step="1000"
          placeholder="150000"
          error={errors.salary_max?.message}
          {...register('salary_max')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Статус" error={errors.status?.message} {...register('status')}>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APPLICATION_STATUS_META[status].label}
            </option>
          ))}
        </Select>
        <Select label="Приоритет" error={errors.priority?.message} {...register('priority')}>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Дата отклика" type="date" error={errors.applied_at?.message} {...register('applied_at')} />
        <Input
          label="Дата следующего действия"
          type="date"
          hint="Например, собеседование или срок тестового задания"
          error={errors.next_action_at?.message}
          {...register('next_action_at')}
        />
      </div>

      <Textarea
        label="Заметки"
        placeholder="Контакты, впечатления, договорённости…"
        rows={4}
        error={errors.notes?.message}
        {...register('notes')}
      />

      {serverError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Отмена
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === 'create' ? 'Создать вакансию' : 'Сохранить изменения'}
        </Button>
      </div>
    </form>
  );
}
