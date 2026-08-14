/**
 * Variant table for the Chip atom. Each status tone uses the
 * `--color-status-*` tokens declared in `tokens.css`.
 */

import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const chipVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium leading-none border',
  {
    variants: {
      tone: {
        default: 'bg-bg-sunk text-ink-700 border-line',
        solid: 'bg-ink-900 text-bg border-ink-900',
        idea: 'bg-bg-sunk text-ink-500 border-line',
        wip: 'bg-status-wip-bg text-status-wip-fg border-status-wip-border',
        rehearsed: 'bg-status-rehearsed-bg text-status-rehearsed-fg border-status-rehearsed-border',
        concert_ready: 'bg-ink-900 text-bg border-ink-900',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

export type ChipVariantProps = VariantProps<typeof chipVariants>;
