import { Link, Outlet } from 'react-router-dom';

import { LogoMark, LogoWordmark } from './Logo';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <Link to="/login" className="mb-8 flex items-center gap-2.5" aria-label="JobTrack AI — на главную">
        <LogoMark className="size-10 rounded-[11px]" />
        <LogoWordmark className="text-[19px]" />
      </Link>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
