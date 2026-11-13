import { cva } from 'class-variance-authority';

export type StatusBandTone = 'asking' | 'recalled' | 'missed';

// @FollowsBlueprint atom-variant
export const statusBandVariants = cva(
  'flex flex-col gap-0.5 min-h-14 px-4 py-2 -mx-4 roomy:mx-0 roomy:rounded-md ' +
    'transition-[background-color,color] duration-200 ease-out-quick',
  {
    variants: {
      tone: {
        asking: 'bg-surface text-ink',
        recalled: 'bg-recalled text-on-recalled',
        missed: 'bg-missed text-on-missed',
      } satisfies Record<StatusBandTone, string>,
    },
  },
);
