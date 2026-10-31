import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Inset-группа в стиле «Настроек» iOS: скруглённая белая карточка со строками. */
export function ListGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'squircle overflow-hidden rounded-card bg-surface shadow-card',
        '[&>*+*]:border-t [&>*+*]:border-separator',
        className,
      )}
      {...rest}
    />
  );
}

/** Заголовок над группой списков (13px, вторичный цвет). */
export function ListGroupLabel({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'px-1 pb-1.5 text-[13px] font-medium tracking-[0.01em] text-muted uppercase',
        className,
      )}
      {...rest}
    />
  );
}
