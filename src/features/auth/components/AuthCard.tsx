import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="squircle p-6 sm:p-8">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-text">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && (
        <div className="mt-6 border-t border-separator pt-4 text-center text-[15px]">{footer}</div>
      )}
    </Card>
  );
}
