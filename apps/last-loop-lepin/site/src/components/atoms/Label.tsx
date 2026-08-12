import type { ReactNode } from 'react';

const LABEL_CLASS = 'text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3';

interface LabelProps {
  readonly htmlFor: string;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Label({ htmlFor, children }: LabelProps) {
  return (
    <label className={LABEL_CLASS} htmlFor={htmlFor}>
      {children}
    </label>
  );
}
