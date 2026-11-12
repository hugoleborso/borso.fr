import type { JSX, ReactNode } from 'react';

export interface PageTitleProps {
  readonly children: ReactNode;
  readonly subtitle?: ReactNode;
  readonly trailing?: ReactNode;
  readonly hasMark?: boolean;
}

const MARK_SOURCE = '/icons/coin-face.webp';
const MARK_SIZE_PX = 28;

// @FollowsBlueprint atom-plain
export function PageTitle({
  children,
  subtitle,
  trailing,
  hasMark = false,
}: PageTitleProps): JSX.Element {
  return (
    <header className="flex items-end justify-between gap-3 pt-4 pb-5">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 m-0 font-display text-display text-ink">
          {hasMark ? (
            <img
              src={MARK_SOURCE}
              alt=""
              width={MARK_SIZE_PX}
              height={MARK_SIZE_PX}
              data-opening-dock=""
              className="size-7 shrink-0"
            />
          ) : null}
          <span className="min-w-0">{children}</span>
        </h1>
        {subtitle === undefined ? null : (
          <p className="m-0 mt-1 text-caption text-ink-muted first-letter:uppercase">{subtitle}</p>
        )}
      </div>
      {trailing}
    </header>
  );
}
