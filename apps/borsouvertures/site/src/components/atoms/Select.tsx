const SELECT_CLASS_NAME =
  'min-h-12 min-w-0 max-w-full px-3 py-2 rounded-md border-2 border-ink bg-field text-base font-bold text-ink';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: readonly SelectOption[];
  ariaLabel: string;
  onSelect: (value: string) => void;
}

// @FollowsBlueprint atom-plain
export function Select({ value, options, ariaLabel, onSelect }: SelectProps) {
  return (
    <select
      className={SELECT_CLASS_NAME}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onSelect(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
