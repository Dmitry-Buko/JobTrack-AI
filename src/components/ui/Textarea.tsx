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
        <label htmlFor={areaId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined}
        className={cn(
          'min-h-24 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text',
          'placeholder:text-muted/70 disabled:cursor-not-allowed disabled:bg-surface-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent/40',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${areaId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${areaId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
