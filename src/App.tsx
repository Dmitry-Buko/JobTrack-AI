import { ENV_ERROR_MESSAGE, env } from '@/lib/env';
import { AuthListener } from '@/features/auth/components/AuthListener';

import { AppRoutes } from './app/routes';

/** Экран-заглушка, когда .env не настроен: приложение честно объясняет, что делать. */
function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold text-text">JobTrack AI не настроен</h1>
        <p className="mt-2 text-sm text-muted">{ENV_ERROR_MESSAGE}</p>
        <p className="mt-4 rounded-lg bg-surface-muted p-3 text-left font-mono text-xs text-muted">
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
