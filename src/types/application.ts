import {
  Bookmark,
  CircleSlash,
  ClipboardList,
  Filter,
  Handshake,
  MessagesSquare,
  Send,
  type LucideIcon,
} from 'lucide-react';

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
  /** Иконка статуса: различает статусы не только цветом. */
  icon: LucideIcon;
}

export const APPLICATION_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  saved: {
    label: 'Сохранена',
    badgeClass: 'bg-neutral-soft text-neutral-strong',
    dotClass: 'bg-neutral',
    icon: Bookmark,
  },
  applied: {
    label: 'Отклик отправлен',
    badgeClass: 'bg-accent-soft text-accent',
    dotClass: 'bg-accent',
    icon: Send,
  },
  screening: {
    label: 'Первичный отбор',
    badgeClass: 'bg-warning-soft text-warning-strong',
    dotClass: 'bg-warning',
    icon: Filter,
  },
  interview: {
    label: 'Собеседование',
    badgeClass: 'bg-indigo-soft text-indigo',
    dotClass: 'bg-indigo',
    icon: MessagesSquare,
  },
  test_task: {
    label: 'Тестовое задание',
    badgeClass: 'bg-yellow-soft text-yellow-strong',
    dotClass: 'bg-yellow',
    icon: ClipboardList,
  },
  offer: {
    label: 'Оффер',
    badgeClass: 'bg-success-soft text-success-strong',
    dotClass: 'bg-success',
    icon: Handshake,
  },
  rejected: {
    label: 'Отказ',
    badgeClass: 'bg-danger-soft text-danger-strong',
    dotClass: 'bg-danger',
    icon: CircleSlash,
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
  low: 'bg-neutral-soft text-neutral-strong',
  medium: 'bg-warning-soft text-warning-strong',
  high: 'bg-danger-soft text-danger-strong',
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
