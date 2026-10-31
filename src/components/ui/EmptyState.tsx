import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Пустое состояние: одна фраза и одно действие, без рамок и «карточек в пустоте». */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-appear">
      {icon && <div className="mb-4 text-titanium">{icon}</div>}
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
