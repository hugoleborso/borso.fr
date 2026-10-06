import type { ReactNode } from 'react';
import { Crumb } from '../atoms/Crumb';
import { composeClassName } from '../atoms/class-name.utils';

export interface PageHeaderProps {
  crumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

// @FollowsBlueprint molecule-presentational
export function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header className={composeClassName('mb-3 sm:mb-5', className)}>
      {crumb !== undefined && crumb !== null && (
        <Crumb className="hidden sm:block mb-2">{crumb}</Crumb>
      )}
      <div className="flex items-end justify-between gap-x-4 gap-y-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display italic text-[26px] sm:text-[44px] lg:text-[56px] leading-[0.98] sm:leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 sm:mb-1">
            {title}
          </h1>
          {subtitle !== undefined && subtitle !== null && (
            <div className="text-xs sm:text-[13px] text-ink-500">{subtitle}</div>
          )}
        </div>
        {actions !== undefined && actions !== null && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
    </header>
  );
}
