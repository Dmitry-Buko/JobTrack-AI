import type {
  Application,
  ApplicationPriority,
  ApplicationStatus,
} from '@/types/application';

/** Фильтр по сроку следующего действия: все / ближайшие 7 дней / просроченные. */
export type ApplicationDueFilter = 'all' | 'week' | 'overdue';

export const DUE_FILTER_LABELS: Record<ApplicationDueFilter, string> = {
  all: 'Все сроки',
  week: 'Ближайшие 7 дней',
  overdue: 'Просроченные',
};

export interface ApplicationFilters {
  search: string;
  status: ApplicationStatus | 'all';
  priority: ApplicationPriority | 'all';
  due: ApplicationDueFilter;
}

export const DEFAULT_FILTERS: ApplicationFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  due: 'all',
};

export type ApplicationSort = 'updated_desc' | 'created_desc' | 'next_action_asc';

export const SORT_LABELS: Record<ApplicationSort, string> = {
  updated_desc: 'По последнему изменению',
  created_desc: 'По дате создания',
  next_action_asc: 'По ближайшему действию',
};

/** Поиск по компании и должности (без учёта регистра). */
export function filterApplications(
  applications: Application[],
  filters: ApplicationFilters,
): Application[] {
  const search = filters.search.trim().toLowerCase();
  const today = todayString();
  const inWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  return applications.filter((application) => {
    if (filters.status !== 'all' && application.status !== filters.status) return false;
    if (filters.priority !== 'all' && application.priority !== filters.priority) return false;
    if (filters.due !== 'all') {
      const due = application.next_action_at;
      if (!due) return false;
      const day = due.slice(0, 10);
      if (filters.due === 'overdue' && day >= today) return false;
      if (filters.due === 'week' && (day < today || day > inWeek)) return false;
    }
    if (search) {
      const haystack = `${application.company} ${application.position}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function sortApplications(
  applications: Application[],
  sort: ApplicationSort,
): Application[] {
  const copy = [...applications];
  switch (sort) {
    case 'created_desc':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'next_action_asc':
      // Вакансии без даты следующего действия — в конец.
      return copy.sort((a, b) => {
        const left = a.next_action_at;
        const right = b.next_action_at;
        if (!left && !right) return b.updated_at.localeCompare(a.updated_at);
        if (!left) return 1;
        if (!right) return -1;
        return left.localeCompare(right);
      });
    case 'updated_desc':
    default:
      return copy.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}
