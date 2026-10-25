import { Badge } from '@/components/ui/Badge';
import { PRIORITY_BADGE_CLASSES, PRIORITY_LABELS, type ApplicationPriority } from '@/types/application';

export function PriorityBadge({ priority }: { priority: ApplicationPriority }) {
  return <Badge className={PRIORITY_BADGE_CLASSES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
