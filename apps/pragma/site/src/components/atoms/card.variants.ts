import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
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
