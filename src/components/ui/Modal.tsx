import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const;

/**
 * Диалог в духе iOS: на мобильных — bottom sheet с «ручкой»,
 * на десктопе — центрированная карточка с крупным радиусом.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={(element) => {
          element?.focus();
        }}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className={cn(
          'squircle relative w-full rounded-t-[20px] bg-surface shadow-raised outline-none',
          'animate-sheet-in sm:animate-pop-in sm:rounded-card',
          SIZE_CLASSES[size],
        )}
      >
        {/* Ручка листа — только на мобильных */}
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-separator sm:hidden" aria-hidden />

        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 sm:pt-4">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-1 flex size-8 items-center justify-center rounded-full text-muted transition duration-200 ease-[var(--ease-ios)] hover:bg-surface-muted active:scale-95 hover:text-text"
          >
            <X className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-2">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
