import { forwardRef, type HTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';

export interface PointsBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly points: number;
}

// @FollowsBlueprint atom-plain
export const PointsBadge = forwardRef<HTMLSpanElement, PointsBadgeProps>(
  ({ className, points, ...rest }, ref) => (
    <span
      ref={ref}
      className={composeClassName(
        'inline-flex min-w-7 min-h-7 items-center justify-center rounded-full bg-accent text-on-accent font-sans font-semibold text-meta tabular-nums',
        className,
      )}
      {...rest}
    >
      {points}
    </span>
  ),
);
PointsBadge.displayName = 'PointsBadge';
