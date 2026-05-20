/**
 * Badge atom — small inline marker (the sidebar nav count, the
 * energy chip, the "M —" mastery chip). The prototype calls these
 * `.badge` (nav count) and `.tag-mono` (mono tag). Both fit one
 * variant table with mono / pill / soft tone variants.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-bg text-ink-500',
        mono: 'bg-bg-sunk text-ink-500 font-mono rounded-sm',
        solid: 'bg-ink-900 text-bg',
        accent: 'bg-accent text-bg-elev',
        warn: 'bg-warn-soft text-warn',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-0.5 text-[11px]',
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, BadgeVariantProps {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, ...rest }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, size }), className)} {...rest} />
  ),
);
Badge.displayName = 'Badge';
