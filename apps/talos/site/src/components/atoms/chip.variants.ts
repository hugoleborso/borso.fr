import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const chipVariants = cva(
  'inline-flex items-center gap-1 h-6 px-2 rounded-sm text-label whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-sunk text-ink-soft',
        outline: 'border border-line text-ink-muted',
        bronze: 'bg-bronze-soft text-bronze',
        patina: 'bg-patina-soft text-patina',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type ChipVariantProps = VariantProps<typeof chipVariants>;
export type ChipTone = NonNullable<ChipVariantProps['tone']>;
