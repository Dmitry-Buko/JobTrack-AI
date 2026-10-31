import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface BadgeProps {
  className?: string;
  children: ReactNode;
}

/** Капсула-бейдж: мягкая заливка цветом статуса, без рамки. */
export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}
