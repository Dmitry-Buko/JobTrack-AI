import { useId } from 'react';
import type { ComponentPropsWithRef } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  label?: string;
  error?: string;
  hint?: string;
}

const CONTROL_CLASSES = [
  'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text',
  'placeholder:text-muted/70 disabled:cursor-not-allowed disabled:bg-surface-muted',
  'focus:outline-none focus:ring-2 focus:ring-accent/40',
];

export function Input({ label, error, hint, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(...CONTROL_CLASSES, error ? 'border-danger' : 'border-border', className)}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
