import type { ReactNode } from 'react';

export interface FieldLabelProps {
  readonly htmlFor?: string;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function FieldLabel({ htmlFor, children }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-soft"
    >
      {children}
    </label>
  );
}
