import type { ValueByFlag } from '@/lib/componentTable.types';

interface TabButtonProps {
  label: string;
  isCurrent: boolean;
  onActivate: () => void;
}

const TAB_BASE = 'flex-1 min-h-14 px-2 py-2 text-sm font-semibold border-t-2';

// @FollowsBlueprint component-lookup-table
const TAB_CLASS_BY_CURRENT: ValueByFlag<string> = {
  true: TAB_BASE + ' border-accent text-accent',
  false: TAB_BASE + ' border-transparent text-ink opacity-80 hover:opacity-100',
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
