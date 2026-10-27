import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const memberMarkVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    shape: {
      dot: 'size-2.5 rounded-pill',
      ring: 'size-3 rounded-pill border-2 bg-transparent',
      cell: 'min-h-11 min-w-11 gap-0.5 rounded-sm px-1',
      lane: 'self-stretch',
    },
    ink: {
      'on-color-dark': 'text-on-color-dark',
      'on-color-light': 'text-on-color-light',
    },
  },
  defaultVariants: { shape: 'dot', ink: 'on-color-dark' },
});

export type MemberMarkVariantProps = VariantProps<typeof memberMarkVariants>;
