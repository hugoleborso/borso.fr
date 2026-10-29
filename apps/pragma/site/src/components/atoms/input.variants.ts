import { cva, type VariantProps } from 'class-variance-authority';

const COARSE_POINTER_MIN_HEIGHT = 'min-h-11';
const IOS_ZOOM_FREE_TEXT_SIZE = 'text-body';

// @FollowsBlueprint atom-variant
export const inputVariants = cva(
  'w-full rounded-md bg-raised border border-rule-strong text-ink ' +
    'outline-none transition-colors focus:border-accent placeholder:text-ink-faint',
  {
    variants: {
      size: {
        sm: `${COARSE_POINTER_MIN_HEIGHT} ${IOS_ZOOM_FREE_TEXT_SIZE} px-2.5 py-1.5`,
        md: `${COARSE_POINTER_MIN_HEIGHT} ${IOS_ZOOM_FREE_TEXT_SIZE} px-3 py-2`,
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type InputVariantProps = VariantProps<typeof inputVariants>;
