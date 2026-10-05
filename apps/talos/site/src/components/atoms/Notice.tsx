import { cva, type VariantProps } from 'class-variance-authority';
import type { JSX, ReactNode } from 'react';

const noticeVariants = cva('m-0 rounded-md px-3 py-2.5 text-body-sm', {
  variants: {
    tone: {
      muted: 'bg-sunk text-ink-soft',
      danger: 'bg-danger-soft text-danger',
      success: 'bg-success-soft text-success',
    },
  },
  defaultVariants: { tone: 'muted' },
});

export interface NoticeProps extends VariantProps<typeof noticeVariants> {
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-variant-table
export function Notice({ tone, children }: NoticeProps): JSX.Element {
  return (
    <p role={tone === 'danger' ? 'alert' : undefined} className={noticeVariants({ tone })}>
      {children}
    </p>
  );
}
