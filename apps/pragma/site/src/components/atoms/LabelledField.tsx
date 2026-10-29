import type { JSX, ReactNode } from 'react';

export interface LabelledFieldProps {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
}

export const FIELD_LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint atom-plain
export function LabelledField({ id, label, children }: LabelledFieldProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className={FIELD_LABEL_CLASS} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
