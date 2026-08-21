import { forwardRef, type HTMLAttributes } from 'react';
import { type ChipVariantProps, chipVariants } from './chip.variants';
import { composeClassName } from './class-name.utils';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement>, ChipVariantProps {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(({ className, tone, ...rest }, ref) => (
  <span ref={ref} className={composeClassName(chipVariants({ tone }), className)} {...rest} />
));
Chip.displayName = 'Chip';
