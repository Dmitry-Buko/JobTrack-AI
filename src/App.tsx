import { ENV_ERROR_MESSAGE, env } from '@/lib/env';
import { AuthListener } from '@/features/auth/components/AuthListener';

import { AppRoutes } from './app/routes';

/** Экран-заглушка, когда .env не настроен: приложение честно объясняет, что делать. */
function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="squircle w-full max-w-lg rounded-card bg-surface p-8 text-center shadow-card">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-text">JobTrack AI не настроен</h1>
        <p className="mt-2 text-[15px] text-muted">{ENV_ERROR_MESSAGE}</p>
        <p className="mt-4 rounded-control bg-surface-muted p-3 text-left font-mono text-[13px] text-muted">
          cp .env.example .env
        </p>
      </div>
    </div>
  );
}

export function App() {
  if (!env) {
    return <SetupScreen />;
  }

  return (
    <>
      <AuthListener />
      <AppRoutes />
    </>
  );
}
