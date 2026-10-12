import { Check } from 'lucide-react';
import type { JSX } from 'react';

export interface CheckboxProps {
  readonly isChecked: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}

const CHECK_SIZE = 14;
const CHECK_STROKE = 3;

// @FollowsBlueprint atom-plain
export function Checkbox({ isChecked, label, onToggle }: CheckboxProps): JSX.Element {
  return (
    <label className="relative inline-flex items-center justify-center w-11 h-11 shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onToggle}
        aria-label={label}
        className="peer appearance-none w-[22px] h-[22px] rounded-sm border-[1.5px] border-line-strong bg-surface transition-colors duration-[120ms] checked:bg-bronze checked:border-bronze cursor-pointer"
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
