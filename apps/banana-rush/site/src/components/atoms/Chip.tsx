import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

const chip = cva(
  'inline-flex items-center gap-1 rounded-pill border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide',
  {
    variants: {
      tone: {
        peel: 'bg-peel-soft text-ink',
        leaf: 'bg-leaf-soft text-ink',
        coral: 'bg-coral-soft text-ink',
        quiet: 'bg-cream-sunk text-ink-soft',
      },
    },
    defaultVariants: { tone: 'quiet' },
  },
);

export interface ChipProps extends VariantProps<typeof chip> {
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-variant
export function Chip({ tone, children }: ChipProps) {
  return <span className={chip({ tone })}>{children}</span>;
}
