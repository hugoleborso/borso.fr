import type { ValueByFlag } from '@/lib/componentTable.types';

interface ToggleSliderProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  ariaLabel: string;
}

const SLIDER_CLASS =
  'inline-flex items-center gap-2 min-h-11 p-[0.2rem] rounded-full ' +
  'transition-transform duration-120 ease-[ease] hover:-translate-y-px';

const TRACK_BASE =
  'relative w-[68px] h-[30px] rounded-full border border-white/[0.18] ' +
  'shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-[background] duration-150 ease-[ease]';

const THUMB_BASE =
  'absolute top-[3px] left-[3px] size-6 rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.4)] ' +
  'transition-[transform,background] duration-180 ease-[ease]';

const LABEL_BASE = 'text-[0.95rem] transition-[opacity,color] duration-150 ease-[ease]';

// @FollowsBlueprint component-lookup-table
const TRACK_CLASS_BY_STATE: ValueByFlag<string> = {
  true: TRACK_BASE + ' bg-[image:var(--gradient-accent)]',
  false: TRACK_BASE + ' bg-[image:var(--gradient-track)]',
};

const THUMB_CLASS_BY_STATE: ValueByFlag<string> = {
  true: THUMB_BASE + ' translate-x-[38px] bg-white',
  false: THUMB_BASE + ' bg-ink',
};

const LABEL_CLASS_BY_ACTIVE: ValueByFlag<string> = {
  true: LABEL_BASE + ' font-semibold text-accent opacity-100',
  false: LABEL_BASE + ' opacity-70',
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
      <span className={LABEL_CLASS_BY_ACTIVE[`${!isOn}`]}>{leftLabel}</span>
      <span className={TRACK_CLASS_BY_STATE[`${isOn}`]}>
        <span className={THUMB_CLASS_BY_STATE[`${isOn}`]} />
      </span>
      <span className={LABEL_CLASS_BY_ACTIVE[`${isOn}`]}>{rightLabel}</span>
    </button>
  );
}
