import { LayoutGrid, List, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
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
          type="search"
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
          className="sm:min-w-52"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <div className="flex items-center pb-[1px]">
          <SegmentedControl
            aria-label="Представление"
            className="w-[112px]"
            value={view}
            onChange={onViewChange}
            options={[
              { value: 'list', label: 'Список', icon: List, srLabel: 'Список' },
              { value: 'board', label: 'Доска', icon: LayoutGrid, srLabel: 'Доска' },
            ]}
          />
        </div>

        <Link to="/applications/new">
          <Button icon={<Plus className="size-4" strokeWidth={1.75} aria-hidden />}>
            <span className="hidden sm:inline">Добавить вакансию</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
