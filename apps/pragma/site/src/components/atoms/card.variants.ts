import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const cardVariants = cva('rounded-lg', {
  variants: {
    variant: {
      default: 'bg-leaf border border-rule p-4 shadow-leaf',
      flat: 'bg-transparent p-4',
      sunk: 'bg-sunk border-0 p-4',
      bare: 'bg-leaf border border-rule overflow-hidden',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;
