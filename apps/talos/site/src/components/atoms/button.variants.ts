import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-body-sm font-semibold select-none ' +
    'transition-colors duration-[120ms] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-bronze border border-bronze text-on-bronze active:bg-bronze-strong',
        secondary: 'bg-surface border border-line-strong text-ink active:bg-sunk',
        quiet: 'bg-transparent border border-transparent text-ink-soft active:bg-sunk',
        danger: 'bg-transparent border border-danger text-danger active:bg-danger-soft',
      },
      size: {
        sm: 'min-h-9 px-3',
        md: 'min-h-11 px-4',
        lg: 'min-h-13 px-5 text-body',
        icon: 'min-h-11 min-w-11 px-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
