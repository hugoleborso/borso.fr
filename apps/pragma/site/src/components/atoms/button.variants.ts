/**
 * Variant table for the Button atom. Variants mirror the prototype's
 * `.btn`, `.btn.primary`, `.btn.accent`, `.btn.ghost`.
 */

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * @Blueprint atom-variant
 * @BlueprintName Atom With Variant Table
 * @BlueprintUsage Use for a user interface primitive with more than two visual variants.
 * @BlueprintDescription Declares the variants as one cva table in a sibling `.variants.ts` module, so a reviewer reads every combination in a single typed object and the component file exports nothing but the component. The atom composes classes through cn rather than string concatenation, which Tailwind cannot see through, and it imports no other component.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium ' +
    'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        default: 'bg-bg-elev border border-line-strong text-ink-900 hover:bg-bg',
        primary: 'bg-ink-900 border border-ink-900 text-bg-elev hover:bg-ink-700',
        accent:
          'bg-accent border border-accent text-bg-elev hover:bg-accent-ink hover:border-accent-ink',
        ghost:
          'bg-transparent border border-transparent text-ink-900 hover:bg-[rgba(26,22,18,0.05)]',
        danger: 'bg-danger border border-danger text-bg-elev hover:opacity-90',
      },
      // Every size clears the 44px touch floor through `min-h-11`, so a
      // coarse pointer can hit the control on a phone.
      size: {
        sm: 'min-h-11 px-2 py-1 text-xs',
        md: 'min-h-11 px-3 py-1.5 text-[13px]',
        lg: 'min-h-11 px-4 py-2 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
