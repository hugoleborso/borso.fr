import type { ReactNode } from 'react';

interface ControlFieldProps {
  label: string;
  value: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function ControlField({ label, value, children }: ControlFieldProps) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-name">{label}</span>
        <span className="field-value">{value}</span>
      </div>
      {children}
    </div>
  );
}
