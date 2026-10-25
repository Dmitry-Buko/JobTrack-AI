import { LogOut, Sparkles } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';

import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { signOut } from '@/features/auth/lib/authService';

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-contrast">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <span className="font-semibold tracking-tight">JobTrack AI</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Выйти из аккаунта"
              className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-text"
              onClick={() => {
                void signOut();
                navigate('/login');
              }}
            >
              <LogOut className="size-[18px]" aria-hidden />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
