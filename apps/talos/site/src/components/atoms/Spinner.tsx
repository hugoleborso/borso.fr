import type { JSX } from 'react';

export interface SpinnerProps {
  readonly label: string;
}

// @FollowsBlueprint atom-plain
export function Spinner({ label }: SpinnerProps): JSX.Element {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2">
      <span className="w-4 h-4 rounded-full border-2 border-line border-t-bronze animate-spin motion-reduce:animate-none" />
    </span>
  );
}
