import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { LogoMark, LogoWordmark } from './Logo';
import { NAV_ITEMS } from './navItems';

/**
 * Бургер-меню для мобильных: кнопка в шапке и выезжающая слева панель
 * с теми же пунктами, что в сайдбаре десктопа. Панель рендерится через
 * портал в body: шапка с backdrop-blur создаёт containing block для fixed,
 * и без портала drawer оказался бы зажат внутри полосы шапки.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Открыть меню"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full text-muted transition duration-200 ease-[var(--ease-ios)] hover:bg-black/[0.05] hover:text-text active:scale-95 dark:hover:bg-white/[0.08]"
      >
        <Menu className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-appear"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Меню"
              tabIndex={-1}
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
              className={cn(
                'absolute inset-y-0 left-0 flex w-[82%] max-w-80 flex-col outline-none',
                'border-r border-separator bg-surface/85 backdrop-blur-2xl shadow-raised animate-drawer-in',
              )}
            >
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <LogoWordmark />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="-mr-1 flex size-8 items-center justify-center rounded-full text-muted transition duration-200 ease-[var(--ease-ios)] hover:bg-black/[0.05] hover:text-text active:scale-95 dark:hover:bg-white/[0.08]"
              >
                <X className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <nav aria-label="Мобильная навигация" className="flex-1 space-y-1 overflow-y-auto px-3 pt-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-full px-3 text-[15px] font-medium',
                      'transition duration-200 ease-[var(--ease-ios)] active:scale-[0.98]',
                      isActive
                        ? 'bg-accent text-accent-contrast'
                        : 'text-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08]',
                    )
                  }
                >
                  <item.icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
