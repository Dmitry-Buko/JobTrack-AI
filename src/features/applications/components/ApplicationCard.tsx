import { CalendarClock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  formatDueDate,
  formatSalaryRange,
} from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types/application';

import { PriorityBadge } from './PriorityBadge';
import { StatusMenu } from './StatusMenu';

export interface ApplicationCardProps {
  application: Application;
  onStatusChange: (status: ApplicationStatus) => void;
  statusDisabled?: boolean;
}

/** Карточка вакансии для представления «списком»: белая поверхность без рамки. */
export function ApplicationCard({ application, onStatusChange, statusDisabled }: ApplicationCardProps) {
  return (
    <div className="group squircle relative rounded-card bg-surface p-4 shadow-card transition duration-200 ease-[var(--ease-ios)] hover:shadow-pop">
      <Link
        to={`/applications/${application.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Открыть вакансию: ${application.company} — ${application.position}`}
      />

      <div className="pointer-events-none flex flex-col gap-2 pr-40">
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
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-warning-strong">
              <CalendarClock className="size-3.5" strokeWidth={1.75} aria-hidden />
              {formatDueDate(application.next_action_at)}
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex items-center gap-2">
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
  );
}
