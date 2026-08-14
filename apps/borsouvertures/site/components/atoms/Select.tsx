const SELECT_CLASS_NAME =
  'min-h-11 px-[0.6rem] py-[0.4rem] rounded-lg border border-edge bg-field text-ink';

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
