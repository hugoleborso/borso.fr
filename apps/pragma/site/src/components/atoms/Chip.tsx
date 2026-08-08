/**
 * Chip atom — status chips (idea / wip / rehearsed / concert_ready),
 * member chips, and generic mono tags.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { type ChipVariantProps, chipVariants } from './chip.variants';
import { cn } from './cn.utils';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement>, ChipVariantProps {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(({ className, tone, ...rest }, ref) => (
  <span ref={ref} className={cn(chipVariants({ tone }), className)} {...rest} />
));
Chip.displayName = 'Chip';
