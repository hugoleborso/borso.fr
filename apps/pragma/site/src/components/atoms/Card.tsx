/**
 * Card atom — paper-elevated surface with the editorial radius +
 * border. Mirrors `.card` from the prototype. `flat` variant drops
 * the border / background so a `Card` can be a layout-only wrapper
 * when the visual emphasis lives elsewhere.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const cardVariants = cva('rounded-lg', {
  variants: {
    variant: {
      default: 'bg-bg-elev border border-line p-4',
      flat: 'bg-transparent p-4',
      sunk: 'bg-bg-sunk border-0 p-4',
      bare: 'bg-bg-elev border border-line overflow-hidden',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;

export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardVariantProps {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...rest }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...rest} />
  ),
);
Card.displayName = 'Card';
