import { useId } from 'react';
import type { ComponentPropsWithRef } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Поля в духе iOS: заливка на поверхности группы, без рамок. */
const CONTROL_CLASSES = [
  'squircle h-10 w-full rounded-control bg-surface-muted px-3 text-[15px] text-text',
  'transition duration-200 ease-[var(--ease-ios)]',
  'placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
  'focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/60',
];

export function Input({ label, error, hint, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(...CONTROL_CLASSES, error && 'ring-2 ring-danger/70', className)}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
