import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <p className="text-5xl font-semibold tracking-tight text-text">404</p>
      <h1 className="text-lg font-semibold text-text">Страница не найдена</h1>
      <p className="max-w-sm text-sm text-muted">
        Возможно, страница переехала или ссылки больше не существует.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
      >
        На дашборд
      </Link>
    </div>
  );
}
