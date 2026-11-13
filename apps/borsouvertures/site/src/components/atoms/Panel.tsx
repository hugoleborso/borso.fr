import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Panel({ title, children }: PanelProps) {
  return (
    <section className="flex flex-col gap-3 p-4 rounded-xl border border-panel-line bg-panel">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
