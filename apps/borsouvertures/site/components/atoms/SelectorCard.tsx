import type { ReactNode } from 'react';
import type { ValueByFlag } from '@/lib/componentTable.types';

export interface SelectorCardProps {
  label: string;
  meta: string;
  board?: ReactNode;
  isActive: boolean;
  onSelect: () => void;
}

const CARD_BASE =
  'flex w-full items-center gap-3 p-[0.65rem] rounded-[10px] border text-left ' +
  'transition-[border-color,background] duration-120 ease-[ease] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

// @FollowsBlueprint component-lookup-table
const CARD_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: CARD_BASE + ' border-accent bg-[image:var(--gradient-card-active)]',
  false:
    CARD_BASE + ' border-card-line bg-sunken hover:border-card-line-hover hover:bg-sunken-hover',
};

// @FollowsBlueprint atom-plain
export function SelectorCard({ label, meta, board, isActive, onSelect }: SelectorCardProps) {
  return (
    <button type="button" className={CARD_CLASS_BY_ACTIVE[`${isActive}`]} onClick={onSelect}>
      {board}
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-[0.85rem] opacity-80">{meta}</div>
      </div>
    </button>
  );
}
