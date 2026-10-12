import type { JSX } from 'react';

export interface CountBadgeProps {
  readonly count: number;
  readonly label: string;
}

// @FollowsBlueprint atom-plain
export function CountBadge({ count, label }: CountBadgeProps): JSX.Element {
  return (
    <span
      aria-label={label}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold leading-none bg-bronze text-on-bronze"
    >
      {count}
    </span>
  );
}
