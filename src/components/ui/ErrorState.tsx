import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Что-то пошло не так',
  message = 'Не удалось загрузить данные. Попробуйте ещё раз.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center animate-appear"
      role="alert"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text">{title}</h3>
      <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry} icon={<RotateCcw className="size-4" strokeWidth={1.75} />}>
          Повторить
        </Button>
      )}
    </div>
  );
}
