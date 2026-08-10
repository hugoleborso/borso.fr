import type { CSSProperties, ReactNode } from 'react';

export interface ChipProps {
  address: string;
  style: CSSProperties;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Chip({ style, children }: ChipProps) {
  return <span style={style}>{children}</span>;
}
