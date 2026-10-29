import { cva, type VariantProps } from 'class-variance-authority';

const SMALLEST_LEGIBLE_TEXT_SIZE = 'text-label';

// @FollowsBlueprint atom-variant
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-sunk text-ink-soft',
        mono: 'bg-sunk text-ink-soft font-mono rounded-sm',
        solid: 'bg-ink text-paper',
        accent: 'bg-accent text-on-accent',
        warn: 'bg-warn-soft text-warn',
      },
      size: {
        sm: `px-1.5 py-0.5 ${SMALLEST_LEGIBLE_TEXT_SIZE}`,
        md: `px-2 py-0.5 ${SMALLEST_LEGIBLE_TEXT_SIZE}`,
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
