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
      className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide text-ink-soft"
    >
      {children}
    </label>
  );
}
