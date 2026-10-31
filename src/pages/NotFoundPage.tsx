import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
      <p className="tabular text-[64px] leading-none font-bold tracking-[-0.03em] text-titanium">404</p>
      <h1 className="text-[22px] font-bold tracking-[-0.01em] text-text">Страница не найдена</h1>
      <p className="max-w-sm text-[15px] text-muted">
        Возможно, страница переехала или ссылки больше не существует.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-[15px] font-semibold text-accent-contrast transition duration-200 ease-[var(--ease-ios)] hover:bg-accent-hover active:scale-[0.97]"
      >
        На дашборд
      </Link>
    </div>
  );
}
