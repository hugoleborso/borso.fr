import type { ReactNode } from 'react';

interface LabelProps {
  readonly htmlFor: string;
  readonly children: ReactNode;
}

export function Label({ htmlFor, children }: LabelProps) {
  return (
    <label className="field-label" htmlFor={htmlFor}>
      {children}
    </label>
  );
}
