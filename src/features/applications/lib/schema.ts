import { z } from 'zod';

import {
  APPLICATION_STATUSES,
  PRIORITIES,
  WORK_FORMATS,
  type Application,
  type ApplicationInsert,
  type ApplicationPriority,
  type ApplicationStatus,
  type WorkFormat,
} from '@/types/application';

/** Значения полей формы: даты и зарплаты — строки, пустая строка = «не указано». */
export interface ApplicationFormValues {
  company: string;
  position: string;
  url: string;
  description: string;
  location: string;
  work_format: WorkFormat | '';
  salary_min: string;
  salary_max: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  applied_at: string;
  next_action_at: string;
  notes: string;
}

const optionalString = (max: number) =>
  z.string().trim().max(max, `Максимум ${max} символов`);

const salaryField = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
    'Укажите неотрицательное число',
  );

const urlField = z
  .string()
  .trim()
  .refine((value) => value === '' || /^https?:\/\/\S+$/.test(value), 'Некорректный URL (начните с http:// или https://)');

export const applicationFormSchema = z
  .object({
    company: z.string().trim().min(1, 'Укажите компанию').max(120, 'Максимум 120 символов'),
    position: z.string().trim().min(1, 'Укажите должность').max(120, 'Максимум 120 символов'),
    url: urlField,
    description: optionalString(10000),
    location: optionalString(120),
    work_format: z.union([z.enum(WORK_FORMATS), z.literal('')]),
    salary_min: salaryField,
    salary_max: salaryField,
    status: z.enum(APPLICATION_STATUSES),
    priority: z.enum(PRIORITIES),
    applied_at: z.string(),
    next_action_at: z.string(),
    notes: optionalString(5000),
  })
  .refine(
    (values) =>
      values.salary_min === '' ||
      values.salary_max === '' ||
      Number(values.salary_min) <= Number(values.salary_max),
    { message: 'Минимальная зарплата не может превышать максимальную', path: ['salary_min'] },
  );

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  company: '',
  position: '',
  url: '',
  description: '',
  location: '',
  work_format: '',
  salary_min: '',
  salary_max: '',
  status: 'saved',
  priority: 'medium',
  applied_at: '',
  next_action_at: '',
  notes: '',
};

export function applicationToFormValues(application: Application): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    url: application.url ?? '',
    description: application.description ?? '',
    location: application.location ?? '',
    work_format: application.work_format ?? '',
    salary_min: application.salary_min != null ? String(application.salary_min) : '',
    salary_max: application.salary_max != null ? String(application.salary_max) : '',
    status: application.status,
    priority: application.priority,
    applied_at: application.applied_at?.slice(0, 10) ?? '',
    next_action_at: application.next_action_at?.slice(0, 10) ?? '',
    notes: application.notes ?? '',
  };
}

export function formValuesToInsert(values: ApplicationFormValues): ApplicationInsert {
  return {
    company: values.company.trim(),
    position: values.position.trim(),
    url: values.url.trim() === '' ? null : values.url.trim(),
    description: values.description.trim() === '' ? null : values.description.trim(),
    location: values.location.trim() === '' ? null : values.location.trim(),
    work_format: values.work_format === '' ? null : values.work_format,
    salary_min: values.salary_min === '' ? null : Number(values.salary_min),
    salary_max: values.salary_max === '' ? null : Number(values.salary_max),
    status: values.status,
    priority: values.priority,
    applied_at: values.applied_at === '' ? null : values.applied_at,
    next_action_at: values.next_action_at === '' ? null : values.next_action_at,
    notes: values.notes.trim() === '' ? null : values.notes.trim(),
  };
}
