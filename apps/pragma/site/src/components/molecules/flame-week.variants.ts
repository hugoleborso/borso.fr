import { cva } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const weekCellVariants = cva(
  'flex aspect-square w-full items-center justify-center rounded-md border',
  {
    variants: {
      state: {
        active: 'border-accent-soft bg-accent-soft',
        joker: 'border-dashed border-ink-faint',
        missed: 'border-rule',
        open: 'border-rule',
        future: 'border-rule',
      },
      isToday: {
        true: 'border-2 border-solid border-accent',
        false: '',
      },
    },
    defaultVariants: { isToday: false },
  },
);

export const JOKER_PIP_CLASS = {
  spent: 'size-6 rounded-pill border border-dashed border-ink-faint',
  left: 'size-6 rounded-pill bg-accent',
} as const;

export const CAPTION_CLASS = {
  'streaks.caption.joker': 'font-semibold text-ink',
  'streaks.caption.today': 'text-ink-soft',
  'streaks.caption.session': 'text-ink-soft',
} as const;
