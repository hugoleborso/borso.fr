import type { JSX, ReactNode } from 'react';

export interface SectionTitleProps {
  readonly children: ReactNode;
  readonly trailing?: ReactNode;
}

// @FollowsBlueprint atom-plain
export function SectionTitle({ children, trailing }: SectionTitleProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 min-h-9 mb-2">
      <h2 className="m-0 text-heading text-ink">{children}</h2>
      {trailing}
    </div>
  );
}
