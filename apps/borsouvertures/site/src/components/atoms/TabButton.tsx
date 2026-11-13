import { Icon, type IconName } from '@/components/atoms/Icon';
import type { ValueByFlag } from '@/lib/componentTable.types';

interface TabButtonProps {
  icon: IconName;
  label: string;
  name: string;
  isCurrent: boolean;
  onActivate: () => void;
}

const TAB_BASE =
  'relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-1 ' +
  'text-[0.8125rem] font-semibold leading-4 whitespace-nowrap ' +
  'before:absolute before:left-1/2 before:-top-px before:h-0.5 before:w-10 before:-translate-x-1/2 ' +
  'transition-[color] duration-150 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const TAB_CLASS_BY_CURRENT: ValueByFlag<string> = {
  true: TAB_BASE + ' text-ink before:bg-accent',
  false: TAB_BASE + ' text-ink-muted hover:text-ink',
};

// @FollowsBlueprint atom-plain
export function TabButton({ icon, label, name, isCurrent, onActivate }: TabButtonProps) {
  return (
    <button
      type="button"
      className={TAB_CLASS_BY_CURRENT[`${isCurrent}`]}
      aria-label={name}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={onActivate}
    >
      <Icon name={icon} />
      <span className="max-w-full overflow-hidden text-ellipsis">{label}</span>
    </button>
  );
}
