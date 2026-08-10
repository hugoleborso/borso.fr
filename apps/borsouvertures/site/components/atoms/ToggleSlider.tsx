import type { ValueByFlag } from '@/lib/componentTable.types';

interface ToggleSliderProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  ariaLabel: string;
}

// @FollowsBlueprint component-lookup-table
const TRACK_CLASS_BY_STATE: ValueByFlag<string> = {
  true: 'toggle-slider on',
  false: 'toggle-slider',
};

const LABEL_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: 'toggle-label active',
  false: 'toggle-label',
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
      className={TRACK_CLASS_BY_STATE[`${isOn}`]}
      onClick={() => onToggle(!isOn)}
      aria-pressed={isOn}
      aria-label={ariaLabel}
    >
      <span className={LABEL_CLASS_BY_ACTIVE[`${!isOn}`]}>{leftLabel}</span>
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      <span className={LABEL_CLASS_BY_ACTIVE[`${isOn}`]}>{rightLabel}</span>
    </button>
  );
}
