import type { ReactNode } from 'react';

export type PillTone = 'in-race' | 'out';

const CLASS_BY_TONE: Readonly<Record<PillTone, string>> = {
  'in-race': 'status-pill in-race',
  out: 'status-pill dnf',
};

interface PillProps {
  readonly tone: PillTone;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-lookup-variants
export function Pill({ tone, children }: PillProps) {
  return <span className={CLASS_BY_TONE[tone]}>{children}</span>;
}
