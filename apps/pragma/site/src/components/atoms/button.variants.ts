import { cva, type VariantProps } from 'class-variance-authority';

export const DEFAULT_BUTTON_VARIANT = 'secondary';

/**
 * @Blueprint atom-variant
 * @BlueprintName Atom With Variant Table
 * @BlueprintUsage Use for a user interface primitive with more than two visual variants.
 * @BlueprintDescription Declares the variants as one cva table in a sibling `.variants.ts` module, so a reviewer reads every combination in a single typed object and the component file exports nothing but the component. The atom composes classes through composeClassName rather than string concatenation, which Tailwind cannot see through, and it imports no other component.
 */
export const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 rounded-pill border-0 font-medium ' +
    'whitespace-nowrap no-underline cursor-pointer transition-[background-color,transform] duration-150 ' +
    'active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ' +
    'disabled:bg-glass disabled:text-ink-soft focus-visible:outline-3 focus-visible:outline-focus',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent hover:bg-accent-pressed',
        secondary: 'bg-glass text-ink hover:bg-hover [&_svg]:text-accent',
        quiet: 'bg-transparent text-ink hover:bg-hover',
        danger: 'bg-danger text-on-danger hover:opacity-90',
        stage: 'bg-stage-hover text-stage-ink hover:bg-stage-press',
      },
      size: {
        sm: 'h-9 px-3 text-meta after:absolute after:inset-x-0 after:-inset-y-1 after:content-[""]',
        md: 'min-h-11 px-4 text-body',
        lg: 'min-h-13 px-5 text-body font-semibold',
      },
    },
    defaultVariants: { variant: DEFAULT_BUTTON_VARIANT, size: 'md' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

// @FollowsBlueprint atom-variant
export const iconButtonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-pill border-0 p-0 ' +
    'cursor-pointer transition-[background-color,transform] duration-150 active:scale-[0.97] ' +
    'disabled:cursor-not-allowed disabled:text-ink-faint focus-visible:outline-3 focus-visible:outline-focus ' +
    'aria-pressed:bg-ink aria-pressed:text-paper',
  {
    variants: {
      variant: {
        quiet: 'bg-transparent text-ink hover:bg-hover',
        primary: 'bg-accent text-on-accent hover:bg-accent-pressed',
        secondary: 'bg-glass text-accent hover:bg-hover',
        danger: 'bg-transparent text-ink-soft hover:bg-danger-soft hover:text-danger',
        stage: 'bg-stage-hover text-stage-ink hover:bg-stage-press',
      },
      size: {
        sm: 'size-9 after:absolute after:-inset-1 after:content-[""]',
        md: 'size-11',
      },
    },
    defaultVariants: { variant: 'quiet', size: 'md' },
  },
);

export type IconButtonVariantProps = VariantProps<typeof iconButtonVariants>;
