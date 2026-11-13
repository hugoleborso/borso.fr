import type { ValueByFlag } from '@/lib/componentTable.types';

interface TabButtonProps {
  label: string;
  isCurrent: boolean;
  onActivate: () => void;
}

const TAB_BASE =
  'relative flex-1 min-w-0 min-h-14 px-1 text-[0.8125rem] font-semibold leading-tight ' +
  'text-balance before:absolute before:inset-x-3 before:-top-px before:h-0.5 ' +
  'transition-[color] duration-150 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const TAB_CLASS_BY_CURRENT: ValueByFlag<string> = {
  true: TAB_BASE + ' text-ink before:bg-accent',
  false: TAB_BASE + ' text-ink-muted hover:text-ink',
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
