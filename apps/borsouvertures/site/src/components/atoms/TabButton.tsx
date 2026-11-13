import type { ValueByFlag } from '@/lib/componentTable.types';

interface TabButtonProps {
  label: string;
  isCurrent: boolean;
  onActivate: () => void;
}

const TAB_BASE =
  'flex-1 min-h-14 px-1 pt-1 text-[0.9375rem] font-bold border-t-4 ' +
  'transition-[border-color,color] duration-150 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const TAB_CLASS_BY_CURRENT: ValueByFlag<string> = {
  true: TAB_BASE + ' border-accent text-on-shell',
  false: TAB_BASE + ' border-transparent text-on-shell-muted hover:text-on-shell',
};

// @FollowsBlueprint atom-plain
export function TabButton({ label, isCurrent, onActivate }: TabButtonProps) {
  return (
    <button
      type="button"
      className={TAB_CLASS_BY_CURRENT[`${isCurrent}`]}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={onActivate}
    >
      {label}
    </button>
  );
}
