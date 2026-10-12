import { cva } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const fieldVariants = cva(
  'w-full rounded-md bg-surface border border-line-strong text-ink text-body ' +
    'outline-none transition-colors duration-[120ms] placeholder:text-ink-faint ' +
    'focus:border-bronze focus:shadow-focus-ring',
  {
    variants: {
      shape: {
        line: 'min-h-11 px-3',
        block: 'min-h-28 px-3 py-2.5 resize-y',
      },
    },
    defaultVariants: { shape: 'line' },
  },
);
