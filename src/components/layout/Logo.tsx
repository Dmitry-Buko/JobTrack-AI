import { Briefcase } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Минималистичный знак приложения: скруглённый квадрат с белым глифом. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'squircle flex size-9 items-center justify-center rounded-[10px] bg-accent text-accent-contrast',
        className,
      )}
      aria-hidden
    >
      <Briefcase className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** Wordmark: «JobTrack» с акцентным «AI». */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[17px] font-bold tracking-[-0.02em] text-text', className)}>
      JobTrack<span className="text-accent"> AI</span>
    </span>
  );
}
