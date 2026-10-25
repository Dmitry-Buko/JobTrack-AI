import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CalendarClock, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { cn, formatRelativeDate, formatSalaryRange } from '@/lib/utils';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  type Application,
  type ApplicationStatus,
} from '@/types/application';

import { PriorityBadge } from './PriorityBadge';
import { StatusMenu } from './StatusMenu';

export interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (application: Application, status: ApplicationStatus) => void;
  statusDisabled?: boolean;
}

interface KanbanCardProps {
  application: Application;
  onStatusChange: (status: ApplicationStatus) => void;
  statusDisabled?: boolean;
}

function KanbanCard({ application, onStatusChange, statusDisabled }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { status: application.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
          : undefined
      }
      className={cn(isDragging && 'relative opacity-80')}
    >
      <Card className="relative p-3 pl-9 transition-colors hover:border-accent/50">
        {/* Ручка перетаскивания — не мешает ссылке и меню статуса */}
        <button
          type="button"
          className="absolute left-2 top-2.5 cursor-grab rounded text-muted/60 hover:text-text active:cursor-grabbing"
          aria-label={`Перетащить вакансию «${application.position}» в другую колонку`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>

        <Link
          to={`/applications/${application.id}`}
          className="absolute inset-0 rounded-xl"
          aria-label={`Открыть вакансию: ${application.company} — ${application.position}`}
        />
        <div className="pointer-events-none flex flex-col gap-1.5 pr-8">
          <h3 className="line-clamp-2 text-sm font-semibold text-text">{application.position}</h3>
          <p className="truncate text-xs text-muted">{application.company}</p>
          <p className="text-xs text-muted">
            {formatSalaryRange(application.salary_min, application.salary_max)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={application.priority} />
            {application.next_action_at && (
              <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                <CalendarClock className="size-3" aria-hidden />
                {formatRelativeDate(application.next_action_at)}
              </span>
            )}
          </div>
        </div>
        <div className="pointer-events-auto absolute right-2 top-2 z-10">
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
    </div>
  );
}

function KanbanColumn({
  status,
  applications,
  onStatusChange,
  statusDisabled,
}: {
  status: ApplicationStatus;
  applications: Application[];
  onStatusChange: (application: Application, status: ApplicationStatus) => void;
  statusDisabled?: boolean;
}) {
  const meta = APPLICATION_STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={`${meta.label} (${applications.length})`}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors',
        isOver ? 'border-accent/60 bg-accent-soft/50' : 'border-border bg-surface-muted/60',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-text">
          <span className={cn('size-2 rounded-full', meta.dotClass)} aria-hidden />
          {meta.label}
        </span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
          {applications.length}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
        {applications.map((application) => (
          <KanbanCard
            key={application.id}
            application={application}
            onStatusChange={(next) => onStatusChange(application, next)}
            statusDisabled={statusDisabled}
          />
        ))}
        {applications.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
            Перетащите вакансию или пока пусто
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Kanban-доска: 7 колонок статусов, горизонтальная прокрутка на узких экранах.
 * Перетаскивание — за ручку слева на карточке; альтернативно смена статуса меню.
 */
export function KanbanBoard({ applications, onStatusChange, statusDisabled }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const applicationId = String(event.active.id);
    const targetStatus = event.over?.id;
    if (!targetStatus) return;

    const application = applications.find((item) => item.id === applicationId);
    if (!application || application.status === targetStatus) return;

    onStatusChange(application, targetStatus as ApplicationStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-2" role="region" aria-label="Kanban-доска вакансий по статусам">
        <div className="flex w-max gap-4 px-0.5 pb-2">
          {APPLICATION_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={applications.filter((item) => item.status === status)}
              onStatusChange={onStatusChange}
              statusDisabled={statusDisabled}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
