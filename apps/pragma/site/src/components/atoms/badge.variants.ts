/**
 * Variant table for the Badge atom. The prototype calls these `.badge`
 * (nav count) and `.tag-mono` (mono tag); both fit one table.
 */

import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
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
      // 12px is the floor: below it a count read at arm's length on a phone
      // stops being a count and becomes a smudge.
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-0.5 text-xs',
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
