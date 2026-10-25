import { Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <Link
        to="/login"
        className="mb-8 flex items-center gap-2.5"
        aria-label="JobTrack AI — на главную"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-contrast">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <span className="text-xl font-semibold tracking-tight">JobTrack AI</span>
      </Link>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
