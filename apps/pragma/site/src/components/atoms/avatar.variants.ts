import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-pill font-semibold tracking-wide',
  {
    variants: {
      size: {
        xs: 'size-6 text-label',
        md: 'size-8 text-label',
        lg: 'size-10 text-meta',
      },
      ink: {
        'on-color-dark': 'text-on-color-dark',
        'on-color-light': 'text-on-color-light',
      },
    },
    defaultVariants: { size: 'xs', ink: 'on-color-dark' },
  },
);

export type AvatarVariantProps = VariantProps<typeof avatarVariants>;
