import { Check } from 'lucide-react';
import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';

export type CheckboxEmphasis = 'none' | 'today' | 'overdue';

export interface CheckboxProps {
  readonly isChecked: boolean;
  readonly label: string;
  readonly onToggle: () => void;
  readonly emphasis?: CheckboxEmphasis;
}

const CHECK_SIZE = 14;
const CHECK_STROKE = 3;
const EMPHASIS_RING: Readonly<Record<CheckboxEmphasis, string>> = {
  none: '',
  today: 'ring-2 ring-meander-now ring-offset-2 ring-offset-surface',
  overdue: 'ring-2 ring-danger ring-offset-2 ring-offset-surface',
};

// @FollowsBlueprint atom-plain
export function Checkbox({
  isChecked,
  label,
  onToggle,
  emphasis = 'none',
}: CheckboxProps): JSX.Element {
  return (
    <label className="relative inline-flex items-center justify-center w-11 h-11 shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onToggle}
        aria-label={label}
        className={composeClassName(
          'peer appearance-none w-[22px] h-[22px] rounded-full border-2 border-line-strong bg-surface transition-colors duration-[120ms] checked:bg-bronze checked:border-bronze cursor-pointer',
          isChecked ? '' : EMPHASIS_RING[emphasis],
        )}
      />
      <Check
        size={CHECK_SIZE}
        strokeWidth={CHECK_STROKE}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0 peer-checked:opacity-100 text-on-bronze"
      />
    </label>
  );
}
