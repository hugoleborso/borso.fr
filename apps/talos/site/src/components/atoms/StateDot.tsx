import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';

export interface StateDotProps {
  readonly isAlert: boolean;
  readonly label: string;
}

// @FollowsBlueprint atom-plain
export function StateDot({ isAlert, label }: StateDotProps): JSX.Element {
  return (
    <span className="inline-flex items-center">
      <span
        aria-hidden="true"
        className={composeClassName(
          'inline-block shrink-0 size-3 rounded-full',
          isAlert ? 'bg-danger' : 'border border-line-strong bg-transparent',
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
