import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { NAV_ITEMS } from './navItems';

/** Нижний tab bar в духе iPhone: blur-фон, подписи 10–11px, safe-area снизу. */
export function MobileNav() {
  return (
    <nav
      aria-label="Мобильная навигация"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-surface/80 backdrop-blur-2xl lg:hidden',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-medium',
                  'transition duration-200 ease-[var(--ease-ios)] active:scale-[0.95]',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('size-6', isActive ? 'scale-105' : undefined)}
                    strokeWidth={isActive ? 2 : 1.75}
                    aria-hidden
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
