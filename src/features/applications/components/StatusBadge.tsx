import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_META, type ApplicationStatus } from '@/types/application';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = APPLICATION_STATUS_META[status];
  return (
    <Badge className={meta.badgeClass}>
      <span className={cn('size-1.5 rounded-full', meta.dotClass)} aria-hidden />
      {meta.label}
    </Badge>
  );
}
