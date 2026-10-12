import { cva } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const toastVariants = cva(
  'flex items-center gap-3 min-h-12 py-2 pr-2 pl-4 rounded-md border shadow-2 text-ink',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-raised border-line',
        success: 'bg-surface-raised border-line',
        info: 'bg-surface-raised border-line',
        danger: 'bg-danger-soft border-transparent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export const toastIconVariants = cva('', {
  variants: {
    tone: {
      neutral: 'text-ink-muted',
      success: 'text-success',
      info: 'text-info',
      danger: 'text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
