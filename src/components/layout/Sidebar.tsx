import { LogOut, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/lib/authService';
import { cn } from '@/lib/utils';

import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const email = useAppSelector((state) => state.auth.user?.email ?? null);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-contrast">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">JobTrack AI</span>
      </div>

      <nav aria-label="Основная навигация" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-surface-muted hover:text-text',
              )
            }
          >
            <item.icon className="size-[18px] shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-muted" title={email ?? undefined}>
            {email ?? 'Профиль'}
          </p>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted"
          icon={<LogOut className="size-4" aria-hidden />}
          onClick={() => void signOut()}
        >
          Выйти
        </Button>
      </div>
    </aside>
  );
}
