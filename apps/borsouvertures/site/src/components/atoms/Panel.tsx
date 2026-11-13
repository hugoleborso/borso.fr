import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function Panel({ title, children }: PanelProps) {
  return (
    <section className="flex flex-col gap-3 pt-3 border-t-[3px] border-ink">
      <h2 className="text-xl font-bold leading-tight tracking-[-0.01em] text-balance">{title}</h2>
      {children}
    </section>
  );
}
