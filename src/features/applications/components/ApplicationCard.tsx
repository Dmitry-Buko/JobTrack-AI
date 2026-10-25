import { CalendarClock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import {
  formatDate,
  formatRelativeDate,
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

/** Карточка вакансии для представления «списком». */
export function ApplicationCard({ application, onStatusChange, statusDisabled }: ApplicationCardProps) {
  return (
    <Card className="group relative p-4 transition-colors hover:border-accent/50">
      <Link
        to={`/applications/${application.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`Открыть вакансию: ${application.company} — ${application.position}`}
      />

      <div className="pointer-events-none flex flex-col gap-2 pr-40">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-text">{application.position}</h3>
          <p className="truncate text-sm text-muted">{application.company}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {application.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {application.location}
            </span>
          )}
          <span>{formatSalaryRange(application.salary_min, application.salary_max)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={application.priority} />
          {application.next_action_at && (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <CalendarClock className="size-3.5" aria-hidden />
              {formatRelativeDate(application.next_action_at)}, {formatDate(application.next_action_at)}
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
    </Card>
  );
}
