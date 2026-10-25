import { LayoutGrid, List, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  PRIORITIES,
  PRIORITY_LABELS,
  type ApplicationPriority,
  type ApplicationStatus,
} from '@/types/application';

import { SORT_LABELS, type ApplicationFilters, type ApplicationSort } from '../lib/filters';

export type ApplicationsView = 'list' | 'board';

export interface ApplicationsToolbarProps {
  filters: ApplicationFilters;
  onFiltersChange: (filters: ApplicationFilters) => void;
  sort: ApplicationSort;
  onSortChange: (sort: ApplicationSort) => void;
  view: ApplicationsView;
  onViewChange: (view: ApplicationsView) => void;
}

export function ApplicationsToolbar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: ApplicationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        <Input
          label="Поиск"
          placeholder="Компания или должность"
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
        />
        <Select
          label="Статус"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({ ...filters, status: event.target.value as ApplicationStatus | 'all' })
          }
        >
          <option value="all">Все статусы</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APPLICATION_STATUS_META[status].label}
            </option>
          ))}
        </Select>
        <Select
          label="Приоритет"
          value={filters.priority}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              priority: event.target.value as ApplicationPriority | 'all',
            })
          }
        >
          <option value="all">Любой</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-end justify-between gap-3 lg:justify-end">
        <Select
          label="Сортировка"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ApplicationSort)}
          className="sm:min-w-56"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <div
          className="flex h-10 items-center rounded-lg border border-border bg-surface p-1"
          role="group"
          aria-label="Представление"
        >
          <button
            type="button"
            aria-pressed={view === 'list'}
            aria-label="Список"
            onClick={() => onViewChange('list')}
            className={cn(
              'flex h-8 w-9 items-center justify-center rounded-md transition-colors',
              view === 'list' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text',
            )}
          >
            <List className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-pressed={view === 'board'}
            aria-label="Доска"
            onClick={() => onViewChange('board')}
            className={cn(
              'flex h-8 w-9 items-center justify-center rounded-md transition-colors',
              view === 'board' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text',
            )}
          >
            <LayoutGrid className="size-4" aria-hidden />
          </button>
        </div>

        <Link to="/applications/new">
          <Button icon={<Plus className="size-4" aria-hidden />}>
            <span className="hidden sm:inline">Добавить вакансию</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
