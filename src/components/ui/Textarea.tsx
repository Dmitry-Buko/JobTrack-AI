import { useId } from 'react';
import type { ComponentPropsWithRef } from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...rest }: TextareaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={areaId} className="block text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined}
        className={cn(
          'squircle min-h-24 w-full rounded-control bg-surface-muted px-3 py-2.5 text-[15px] text-text',
          'transition duration-200 ease-[var(--ease-ios)]',
          'placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
          'focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/60',
          error && 'ring-2 ring-danger/70',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${areaId}-error`} className="text-[13px] text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={`${areaId}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
