import type { ReactNode } from 'react';

interface SelectorCardProps {
  label: string;
  meta?: string;
  board?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function SelectorCard({ label, meta, board, active, disabled, onClick }: SelectorCardProps) {
  return (
    <button
      type="button"
      className={`selector-card ${active ? 'active' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {board}
      <div>
        <div className="title">{label}</div>
        {meta && <div className="meta">{meta}</div>}
      </div>
    </button>
  );
}
