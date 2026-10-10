import type { JSX } from 'react';
import { type ClosenessLevel, closenessDotVariants } from './closeness-dot.variants';

export interface ClosenessDotProps {
  readonly level: ClosenessLevel;
  readonly label: string;
}

// @FollowsBlueprint atom-plain
export function ClosenessDot({ level, label }: ClosenessDotProps): JSX.Element {
  return (
    <span className="inline-flex items-center">
      <span aria-hidden="true" className={closenessDotVariants({ level })} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
