import { Badge } from '@/components/ui/Badge';
import { APPLICATION_STATUS_META, type ApplicationStatus } from '@/types/application';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = APPLICATION_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge className={meta.badgeClass}>
      <Icon className="size-3" strokeWidth={2} aria-hidden />
      {meta.label}
    </Badge>
  );
}
