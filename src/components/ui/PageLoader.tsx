import { Spinner } from './Spinner';

export function PageLoader({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="size-7" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
