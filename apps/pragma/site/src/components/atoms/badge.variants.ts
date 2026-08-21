import { cva, type VariantProps } from 'class-variance-authority';

const SMALLEST_LEGIBLE_TEXT_SIZE = 'text-xs';

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
      size: {
        sm: `px-1.5 py-0.5 ${SMALLEST_LEGIBLE_TEXT_SIZE}`,
        md: `px-2 py-0.5 ${SMALLEST_LEGIBLE_TEXT_SIZE}`,
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
