/**
 * Variant table for the Avatar atom. Sizes mirror the prototype's
 * `.mchip` / `.mchip.lg` / `.mchip.xl`.
 */

import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-bg-elev tracking-wide',
  {
    variants: {
      size: {
        sm: 'w-[22px] h-[22px] text-[10.5px]',
        md: 'w-7 h-7 text-xs',
        lg: 'w-10 h-10 text-sm',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export type AvatarVariantProps = VariantProps<typeof avatarVariants>;
