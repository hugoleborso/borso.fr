import type { ReactNode } from 'react';
import type { ValueByFlag } from '@/lib/componentTable.types';

export interface SelectorCardProps {
  label: string;
  meta: string;
  board?: ReactNode;
  isActive: boolean;
  onSelect: () => void;
}

// @FollowsBlueprint component-lookup-table
const CARD_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: 'selector-card active',
  false: 'selector-card',
};

// @FollowsBlueprint atom-plain
export function SelectorCard({ label, meta, board, isActive, onSelect }: SelectorCardProps) {
  return (
    <button type="button" className={CARD_CLASS_BY_ACTIVE[`${isActive}`]} onClick={onSelect}>
      {board}
      <div>
        <div className="title">{label}</div>
        <div className="meta">{meta}</div>
      </div>
    </button>
  );
}
