import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const cardVariants = cva('rounded-lg', {
  variants: {
    tone: {
      plain: 'bg-surface border border-line shadow-1',
      flat: 'bg-surface border border-line',
      sunk: 'bg-sunk',
      bronze: 'bg-bronze-soft',
    },
    padding: { none: 'p-0', md: 'p-4', lg: 'p-5' },
  },
  defaultVariants: { tone: 'plain', padding: 'md' },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;
