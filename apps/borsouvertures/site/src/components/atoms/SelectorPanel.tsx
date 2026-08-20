import type { ReactNode } from 'react';

interface SelectorPanelProps {
  title: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function SelectorPanel({ title, children }: SelectorPanelProps) {
  return (
    <div className="min-h-60 p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[1.17rem] font-bold">{title}</h2>
      </div>
      <div className="grid [grid-auto-rows:1fr] gap-[0.6rem] max-h-90 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}
