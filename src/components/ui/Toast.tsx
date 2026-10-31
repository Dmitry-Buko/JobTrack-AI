import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_AUTO_HIDE_MS = 4000;

const TOAST_ICON: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-strong" strokeWidth={1.75} aria-hidden />,
  error: <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger-strong" strokeWidth={1.75} aria-hidden />,
  info: <Info className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => remove(id), TOAST_AUTO_HIDE_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'squircle pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[20px]',
              'bg-surface-raised/85 px-4 py-3 shadow-pop backdrop-blur-xl animate-appear',
            )}
          >
            {TOAST_ICON[toast.type]}
            <p className="flex-1 text-[15px] leading-snug text-text">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="-mt-0.5 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-text"
              aria-label="Скрыть уведомление"
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast должен использоваться внутри ToastProvider');
  }
  return context;
}
