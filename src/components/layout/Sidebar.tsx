import { LogOut, MoonStar } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Switch } from '@/components/ui/Switch';
import { signOut } from '@/features/auth/lib/authService';
import { cn } from '@/lib/utils';

import { LogoMark, LogoWordmark } from './Logo';
import { NAV_ITEMS } from './navItems';

export function Sidebar() {
  const email = useAppSelector((state) => state.auth.user?.email ?? null);
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden w-64 flex-col',
        'border-r border-separator bg-surface/70 backdrop-blur-2xl lg:flex',
      )}
    >
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-6">
        <LogoMark />
        <LogoWordmark />
      </div>

      <nav aria-label="Основная навигация" className="flex-1 space-y-1 px-3 pt-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
            <item.icon
              className={cn('size-5 shrink-0')}
              strokeWidth={1.75}
              aria-hidden
            />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-separator p-3">
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <MoonStar className="size-5 shrink-0 text-titanium" strokeWidth={1.75} aria-hidden />
            <span className="truncate text-[15px] text-text">Тёмная тема</span>
          </span>
          <Switch checked={theme === 'dark'} label="Тёмная тема" onClick={toggleTheme} />
        </div>

        <p className="truncate px-2 pb-1 pt-2 text-[13px] text-muted" title={email ?? undefined}>
          {email ?? 'Профиль'}
        </p>

        <button
          type="button"
          onClick={() => void signOut()}
          className={cn(
            'flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-[15px] text-danger-strong',
            'transition duration-200 ease-[var(--ease-ios)] hover:bg-danger-soft active:scale-[0.98]',
          )}
        >
          <LogOut className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          Выйти
        </button>
      </div>
    </aside>
  );
}
