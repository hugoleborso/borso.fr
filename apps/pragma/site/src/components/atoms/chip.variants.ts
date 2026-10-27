import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-sunk text-ink-soft',
        solid: 'bg-ink text-paper',
        idea: 'bg-sunk text-ink-soft',
        wip: 'bg-warn-soft text-warn',
        rehearsed: 'bg-good-soft text-good',
        concert_ready: 'bg-ink text-paper',
        choice:
          'border-0 bg-glass text-ink cursor-pointer hover:bg-hover aria-pressed:bg-ink aria-pressed:text-paper ' +
          'disabled:cursor-not-allowed disabled:text-ink-faint focus-visible:outline-3 focus-visible:outline-focus',
      },
      size: {
        sm: 'px-2 py-1 text-label',
        md: 'min-h-11 px-3 text-meta',
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  },
);

export type ChipVariantProps = VariantProps<typeof chipVariants>;
