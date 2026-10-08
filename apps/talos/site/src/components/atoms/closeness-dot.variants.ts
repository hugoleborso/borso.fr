import { cva } from 'class-variance-authority';

export const CLOSENESS_LEVELS = ['none', 'faint', 'light', 'medium', 'strong', 'full'] as const;

export type ClosenessLevel = (typeof CLOSENESS_LEVELS)[number];

// @FollowsBlueprint atom-variant
export const closenessDotVariants = cva('inline-block shrink-0 size-3 rounded-full', {
  variants: {
    level: {
      none: 'border border-line-strong bg-transparent',
      faint: 'bg-bronze/20',
      light: 'bg-bronze/40',
      medium: 'bg-bronze/60',
      strong: 'bg-bronze/80',
      full: 'bg-bronze',
    },
  },
  defaultVariants: { level: 'none' },
});
