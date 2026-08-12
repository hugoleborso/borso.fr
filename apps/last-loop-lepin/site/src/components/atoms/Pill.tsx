import clsx from 'clsx';
import type { ReactNode } from 'react';

export type PillTone = 'in-race' | 'out';

const PILL_CLASS =
  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.08em]';

const CLASS_BY_TONE: Readonly<Record<PillTone, string>> = {
  'in-race': 'bg-accent/14 text-accent',
  out: 'bg-danger/14 text-danger',
};

interface PillProps {
  readonly tone: PillTone;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-lookup-variants
export function Pill({ tone, children }: PillProps) {
  return <span className={clsx(PILL_CLASS, CLASS_BY_TONE[tone])}>{children}</span>;
}
