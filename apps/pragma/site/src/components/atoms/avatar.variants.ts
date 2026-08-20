import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-bg-elev tracking-wide',
  {
    variants: {
      size: {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-[22px] h-[22px] text-xs',
        md: 'w-7 h-7 text-xs',
        lg: 'w-10 h-10 text-sm',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export type AvatarVariantProps = VariantProps<typeof avatarVariants>;
