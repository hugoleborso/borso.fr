/**
 * PageHeader — the editorial `.ph` block from the prototype.
 *  - optional `crumb` (uppercase letterspaced label),
 *  - serif italic display H1,
 *  - dense, ink-500 subtitle,
 *  - right-side actions slot (typically Buttons).
 */

import type { ReactNode } from 'react';
import { Crumb } from '../atoms/Crumb';
import { cn } from '../atoms/cn.utils';

export interface PageHeaderProps {
  crumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header className={cn('mb-5', className)}>
      {crumb !== undefined && crumb !== null && <Crumb className="mb-2">{crumb}</Crumb>}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display italic text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-1">
            {title}
          </h1>
          {subtitle !== undefined && subtitle !== null && (
            <div className="text-[13px] text-ink-500">{subtitle}</div>
          )}
        </div>
        {actions !== undefined && actions !== null && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
    </header>
  );
}
