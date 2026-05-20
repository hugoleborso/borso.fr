/**
 * Chip atom — status chips (idea / wip / rehearsed / concert_ready),
 * member chips, generic mono tags. The prototype calls these
 * `.chip`, `.chip-status-*`. Each status uses a distinct fg/bg
 * already declared in `tokens.css` (`--color-status-wip-*` etc.).
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const chipVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium leading-none border',
  {
    variants: {
      tone: {
        default: 'bg-bg-sunk text-ink-700 border-line',
        solid: 'bg-ink-900 text-bg border-ink-900',
        idea: 'bg-bg-sunk text-ink-500 border-line',
        wip: 'bg-status-wip-bg text-status-wip-fg border-status-wip-border',
        rehearsed:
          'bg-status-rehearsed-bg text-status-rehearsed-fg border-status-rehearsed-border',
        concert_ready: 'bg-ink-900 text-bg border-ink-900',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

export type ChipVariantProps = VariantProps<typeof chipVariants>;

export interface ChipProps extends HTMLAttributes<HTMLSpanElement>, ChipVariantProps {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, tone, ...rest }, ref) => (
    <span ref={ref} className={cn(chipVariants({ tone }), className)} {...rest} />
  ),
);
Chip.displayName = 'Chip';
