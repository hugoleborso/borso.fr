import type { ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Overline } from '../atoms/Overline';

export interface PageHeaderProps {
  crumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  inline?: ReactNode;
  className?: string;
}

// @FollowsBlueprint molecule-presentational
export function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
  inline,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header className={composeClassName('mb-3 sm:mb-5', className)}>
      {crumb !== undefined && crumb !== null && (
        <Overline className="mb-2 hidden sm:block">{crumb}</Overline>
      )}
      <div className="flex items-end justify-between gap-x-4 gap-y-2 flex-wrap">
        <div
          className={composeClassName(
            'min-w-0',
            inline !== undefined && 'flex-1 flex items-center gap-3 sm:gap-6',
          )}
        >
          <div className="min-w-0 shrink-0">
            <h1 className="m-0 font-display text-display text-ink sm:mb-1">{title}</h1>
            {subtitle !== undefined && subtitle !== null && (
              <div className="text-meta text-ink-soft">{subtitle}</div>
            )}
          </div>
          {inline === undefined ? null : (
            <div className="min-w-0 flex-1 sm:max-w-[380px]">{inline}</div>
          )}
        </div>
        {actions !== undefined && actions !== null && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
    </header>
  );
}
