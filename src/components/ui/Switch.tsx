import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  checked: boolean;
  /** Подпись для скринридеров, если рядом нет видимого текста. */
  label: string;
}

/** Переключатель в стиле iOS: зелёная дорожка, белая ручка, пружинное движение. */
export function Switch({ checked, label, className, onClick, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full',
        'transition-colors duration-250 ease-[var(--ease-ios)]',
        checked ? 'bg-success' : 'bg-black/10 dark:bg-white/20',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'absolute left-[2px] top-1/2 size-[27px] -translate-y-1/2 rounded-full bg-white',
          'shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_1px_rgba(0,0,0,0.1)]',
          'transition-transform duration-250 ease-[var(--ease-ios)]',
          checked ? 'translate-x-[20px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}
