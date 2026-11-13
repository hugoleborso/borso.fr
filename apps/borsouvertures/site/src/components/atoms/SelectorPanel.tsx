import type { ReactNode } from 'react';

interface SelectorPanelProps {
  title: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function SelectorPanel({ title, children }: SelectorPanelProps) {
  return (
    <div className="min-h-60 pt-3 border-t-[3px] border-ink">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="grid content-start gap-[0.6rem] max-h-90 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}
