import { LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';

import { ThemeToggle } from './ThemeToggle';
import { MobileMenu } from './MobileMenu';
import { Sidebar } from './Sidebar';
import { LogoMark, LogoWordmark } from './Logo';
import { signOut } from '@/features/auth/lib/authService';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="lg:pl-64">
        <header
          className={cn(
            'sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 lg:hidden',
            'border-b border-separator bg-bg/75 backdrop-blur-xl',
          )}
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2">
            <MobileMenu />
            <LogoMark className="size-8 rounded-[9px]" />
            <LogoWordmark />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Выйти из аккаунта"
              className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-text dark:hover:bg-white/[0.08]"
              onClick={() => {
                void signOut();
                navigate('/login');
              }}
            >
              <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 lg:px-8 lg:pt-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
