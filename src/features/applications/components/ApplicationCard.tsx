import { CalendarClock, CalendarPlus, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  formatDueDate,
  formatSalaryRange,
  isOverdue,
} from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types/application';

import { downloadApplicationIcs } from '../lib/ics';
import { PriorityBadge } from './PriorityBadge';
import { StatusMenu } from './StatusMenu';

export interface ApplicationCardProps {
  application: Application;
  onStatusChange: (status: ApplicationStatus) => void;
  statusDisabled?: boolean;
}

/** Карточка вакансии для представления «списком»: белая поверхность без рамки. */
export function ApplicationCard({ application, onStatusChange, statusDisabled }: ApplicationCardProps) {
  const overdue = isOverdue(application.next_action_at);

  return (
    <div className="group squircle relative min-w-0 rounded-card bg-surface p-4 shadow-card transition duration-200 ease-[var(--ease-ios)] hover:shadow-pop">
      <Link
        to={`/applications/${application.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Открыть вакансию: ${application.company} — ${application.position}`}
      />

      {/* На мобильных кнопки статуса и календаря идут в общем потоке после текста,
          на sm+ — как раньше, абсолютом в правом верхнем углу (под них pr-40). */}
      <div className="pointer-events-none flex flex-col gap-2 sm:pr-40">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-text">
            {application.position}
          </h3>
          <p className="truncate text-[15px] text-muted">{application.company}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          {application.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
              {application.location}
            </span>
          )}
          <span className="tabular">{formatSalaryRange(application.salary_min, application.salary_max)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={application.priority} />
          {application.next_action_at && (
            <span
              className={`inline-flex items-center gap-1 text-[13px] font-medium ${
                overdue ? 'text-danger-strong' : 'text-warning-strong'
              }`}
            >
              <CalendarClock className="size-3.5" strokeWidth={1.75} aria-hidden />
              {formatDueDate(application.next_action_at)}
              {overdue && <span>· просрочено</span>}
            </span>
          )}
        </div>

        <div className="pointer-events-auto relative z-10 flex items-center gap-2 sm:absolute sm:right-3 sm:top-3">
          {application.next_action_at && (
            <button
              type="button"
              onClick={() => downloadApplicationIcs(application)}
              aria-label={`Добавить в календарь: ${application.company} — ${application.position}`}
              title="Добавить в календарь"
              className="flex size-8 items-center justify-center rounded-full text-muted transition duration-200 ease-[var(--ease-ios)] hover:bg-surface-muted hover:text-text active:scale-95"
            >
              <CalendarPlus className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <StatusMenu
            value={application.status}
            onChange={onStatusChange}
            disabled={statusDisabled}
            size="sm"
            align="right"
            label={`Статус вакансии ${application.company}: изменить`}
          />
        </div>
      </div>
    </div>
  );
}
