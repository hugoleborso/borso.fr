import type { ReactNode } from 'react';

interface SelectorPanelProps {
  title: string;
  children: ReactNode;
}

export function SelectorPanel({ title, children }: SelectorPanelProps) {
  return (
    <div className="panel selector-panel">
      <div className="panel-header">
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div className="selector-list">{children}</div>
    </div>
  );
}
