import type { ReactNode } from 'react';
import type { ValueByFlag } from '@/lib/componentTable.types';

export interface SelectorCardProps {
  label: string;
  meta: string;
  detail?: string;
  board?: ReactNode;
  isActive: boolean;
  onSelect: () => void;
}

const CARD_BASE =
  'flex w-full items-center gap-3 min-h-16 py-2 pr-1 border-b border-rule text-left ' +
  'transition-[background-color,box-shadow] duration-150 ease-out-quick ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

// @FollowsBlueprint component-lookup-table
const CARD_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: CARD_BASE + ' bg-surface shadow-[inset_4px_0_0_var(--color-accent)] pl-3',
  false: CARD_BASE + ' hover:bg-surface',
};

// @FollowsBlueprint atom-plain
export function SelectorCard({
  label,
  meta,
  detail,
  board,
  isActive,
  onSelect,
}: SelectorCardProps) {
  return (
    <button type="button" className={CARD_CLASS_BY_ACTIVE[`${isActive}`]} onClick={onSelect}>
      {board}
      <div className="flex flex-col min-w-0">
        <div className="font-bold leading-snug text-balance">{label}</div>
        <div className="text-sm text-ink-muted tabular-nums">{meta}</div>
        {detail === undefined ? null : (
          <div className="text-sm font-bold tabular-nums">{detail}</div>
        )}
      </div>
    </button>
  );
}
