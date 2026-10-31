import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Подпись для скринридеров, если сегмент только с иконкой. */
  srLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  className?: string;
  size?: 'sm' | 'lg';
}

/** Сегментированный контрол в духе iOS: утопленная дорожка и белый «бегунок». */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'sm',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex rounded-[11px] bg-surface-muted p-[3px]', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[9px] px-3',
              size === 'lg' ? 'h-11 text-[15px]' : 'h-8 text-[13px]',
              'font-medium transition duration-200 ease-[var(--ease-ios)]',
              active
                ? 'bg-surface text-text shadow-[0_1px_4px_rgba(0,0,0,0.14)]'
                : 'text-muted hover:text-text active:scale-[0.97]',
            )}
          >
            {Icon && <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />}
            {option.srLabel ? <span className="sr-only">{option.srLabel}</span> : option.label}
          </button>
        );
      })}
    </div>
  );
}
