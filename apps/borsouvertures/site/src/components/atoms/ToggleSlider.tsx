import type { ValueByFlag } from '@/lib/componentTable.types';

interface ToggleSliderProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  ariaLabel: string;
}

const SLIDER_CLASS = 'inline-flex self-start items-stretch min-h-12 p-1 rounded-md bg-surface';

const SIDE_BASE =
  'inline-flex items-center justify-center min-w-12 px-3 rounded-[4px] text-base font-bold ' +
  'transition-[background-color,color] duration-150 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const SIDE_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: SIDE_BASE + ' bg-primary text-on-primary',
  false: SIDE_BASE + ' text-ink-muted',
};

// @FollowsBlueprint atom-plain
export function ToggleSlider({
  isOn,
  onToggle,
  leftLabel,
  rightLabel,
  ariaLabel,
}: ToggleSliderProps) {
  return (
    <button
      type="button"
      className={SLIDER_CLASS}
      onClick={() => onToggle(!isOn)}
      aria-pressed={isOn}
      aria-label={ariaLabel}
    >
      <span className={SIDE_CLASS_BY_ACTIVE[`${!isOn}`]}>{leftLabel}</span>
      <span className={SIDE_CLASS_BY_ACTIVE[`${isOn}`]}>{rightLabel}</span>
    </button>
  );
}
