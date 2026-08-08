/**
 * Badge atom — small inline marker (the sidebar nav count, the energy
 * chip, the "M —" mastery chip).
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { type BadgeVariantProps, badgeVariants } from './badge.variants';
import { composeClassName } from './class-name.utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, BadgeVariantProps {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, ...rest }, ref) => (
    <span
      ref={ref}
      className={composeClassName(badgeVariants({ tone, size }), className)}
      {...rest}
    />
  ),
);
Badge.displayName = 'Badge';
