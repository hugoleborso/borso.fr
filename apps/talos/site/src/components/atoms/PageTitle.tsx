import type { JSX, ReactNode } from 'react';

export interface PageTitleProps {
  readonly children: ReactNode;
  readonly subtitle?: string;
  readonly trailing?: ReactNode;
}

// @FollowsBlueprint atom-plain
export function PageTitle({ children, subtitle, trailing }: PageTitleProps): JSX.Element {
  return (
    <header className="flex items-end justify-between gap-3 pt-4 pb-5">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-display text-ink">{children}</h1>
        {subtitle === undefined ? null : (
          <p className="m-0 mt-1 text-caption text-ink-muted first-letter:uppercase">{subtitle}</p>
        )}
      </div>
      {trailing}
    </header>
  );
}
