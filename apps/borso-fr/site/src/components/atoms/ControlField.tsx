import type { ReactNode } from 'react';

interface ControlFieldProps {
  label: string;
  value: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function ControlField({ label, value, children }: ControlFieldProps) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-atelier-serif text-[15px] font-normal text-atelier-ink italic atelier-roomy:text-[17px]">
          {label}
        </span>
        <span className="font-atelier-mono text-[12px] tracking-[0.04em] tabular-nums text-atelier-ink-soft">
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}
