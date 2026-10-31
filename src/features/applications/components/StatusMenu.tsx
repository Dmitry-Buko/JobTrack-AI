import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  type ApplicationStatus,
} from '@/types/application';

export interface StatusMenuProps {
  value: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
  disabled?: boolean;
  /** Подпись кнопки для скринридеров. */
  label?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

/**
 * Доступное меню смены статуса вакансии в духе iOS: капсула-триггер
 * без рамки и всплывающее меню с галочкой у выбранного пункта.
 */
export function StatusMenu({
  value,
  onChange,
  disabled = false,
  label,
  align = 'left',
  size = 'md',
}: StatusMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const meta = APPLICATION_STATUS_META[value];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ?? `Статус: ${meta.label}. Изменить`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-surface-muted font-medium text-text',
          'transition duration-200 ease-[var(--ease-ios)] active:scale-[0.97]',
          'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
          'disabled:pointer-events-none disabled:opacity-40',
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
        )}
      >
        <span className={cn('size-1.5 rounded-full', meta.dotClass)} aria-hidden />
        <span className="max-w-40 truncate">{meta.label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Выбор статуса"
          className={cn(
            'squircle absolute top-full z-30 mt-1.5 min-w-56 origin-top overflow-hidden rounded-menu bg-surface-raised p-1.5 shadow-pop animate-pop-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {APPLICATION_STATUSES.map((status) => {
            const statusMeta = APPLICATION_STATUS_META[status];
            const selected = status === value;
            return (
              <li key={status} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!selected) onChange(status);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[15px]',
                    'transition-colors duration-150',
                    selected ? 'text-accent' : 'text-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                  )}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', statusMeta.dotClass)} aria-hidden />
                  <span className="flex-1">{statusMeta.label}</span>
                  {selected && <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
