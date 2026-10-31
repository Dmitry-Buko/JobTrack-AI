import { cn } from '@/lib/utils';

/** Скелетон в тон поверхностей: чуть темнее фона, мягкое дыхание. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-control bg-black/[0.06] dark:bg-white/[0.08]', className)} />
  );
}
