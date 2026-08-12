import type { ReactNode } from 'react';

export interface ChipProps {
  address: string;
  className: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Chip({ className, children }: ChipProps) {
  return <span className={className}>{children}</span>;
}
