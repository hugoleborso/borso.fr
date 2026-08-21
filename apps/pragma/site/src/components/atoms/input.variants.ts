import { cva, type VariantProps } from 'class-variance-authority';

const COARSE_POINTER_MIN_HEIGHT = 'min-h-11';
const IOS_ZOOM_FREE_TEXT_SIZE = 'text-base';

// @FollowsBlueprint atom-variant
export const inputVariants = cva(
  'w-full rounded-md bg-bg-elev border border-line text-ink-900 ' +
    'outline-none transition-colors focus:border-ink-700 placeholder:text-ink-400',
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
