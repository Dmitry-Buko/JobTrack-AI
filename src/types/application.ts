export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'screening',
  'interview',
  'test_task',
  'offer',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const WORK_FORMATS = ['office', 'remote', 'hybrid'] as const;
export type WorkFormat = (typeof WORK_FORMATS)[number];

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type ApplicationPriority = (typeof PRIORITIES)[number];

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const APPLICATION_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  saved: {
    label: 'Сохранена',
    badgeClass: 'border-border bg-surface-muted text-muted',
    dotClass: 'bg-muted',
  },
  applied: {
    label: 'Отклик отправлен',
    badgeClass: 'border-accent/30 bg-accent-soft text-accent',
    dotClass: 'bg-accent',
  },
  screening: {
    label: 'Первичный отбор',
    badgeClass: 'border-warning/30 bg-warning-soft text-warning',
    dotClass: 'bg-warning',
  },
  interview: {
    label: 'Собеседование',
    badgeClass: 'border-accent/30 bg-accent-soft text-accent',
    dotClass: 'bg-accent',
  },
  test_task: {
    label: 'Тестовое задание',
    badgeClass: 'border-warning/30 bg-warning-soft text-warning',
    dotClass: 'bg-warning',
  },
  offer: {
    label: 'Оффер',
    badgeClass: 'border-success/30 bg-success-soft text-success',
    dotClass: 'bg-success',
  },
  rejected: {
    label: 'Отказ',
    badgeClass: 'border-danger/30 bg-danger-soft text-danger',
    dotClass: 'bg-danger',
  },
};

export const WORK_FORMAT_LABELS: Record<WorkFormat, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
};

export const PRIORITY_LABELS: Record<ApplicationPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

export const PRIORITY_BADGE_CLASSES: Record<ApplicationPriority, string> = {
  low: 'border-border bg-surface-muted text-muted',
  medium: 'border-warning/30 bg-warning-soft text-warning',
  high: 'border-danger/30 bg-danger-soft text-danger',
};

/** Строка таблицы applications (имена полей совпадают с колонками БД). */
export interface Application {
  id: string;
  user_id: string;
  company: string;
  position: string;
  url: string | null;
  description: string | null;
  location: string | null;
  work_format: WorkFormat | null;
  salary_min: number | null;
  salary_max: number | null;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  applied_at: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationInsert = Omit<
  Application,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export type ApplicationUpdate = Partial<ApplicationInsert>;
