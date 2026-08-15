/**
 * Variant table for the Input atom. Deliberately thin: a component that
 * needs a leading icon wraps the Input rather than adding an icon prop.
 */

import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const inputVariants = cva(
  'w-full rounded-md bg-bg-elev border border-line text-ink-900 ' +
    'outline-none transition-colors focus:border-ink-700 placeholder:text-ink-400',
  {
    variants: {
      // Every size clears the 44px touch floor through `min-h-11`, so a
      // coarse pointer can hit the field on a phone, and renders at 16px
      // because iOS Safari zooms the whole page in when a focused control
      // is any smaller. The sizes differ in padding only.
      size: {
        sm: 'min-h-11 px-2.5 py-1.5 text-base',
        md: 'min-h-11 px-3 py-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type InputVariantProps = VariantProps<typeof inputVariants>;
