import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Select({ label, error, hint, className, id, children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'squircle h-10 w-full appearance-none rounded-control bg-surface-muted px-3 pr-9 text-[15px] text-text',
            'transition duration-200 ease-[var(--ease-ios)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/60',
            error && 'ring-2 ring-danger/70',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      {error ? (
        <p className="text-[13px] text-danger-strong">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
