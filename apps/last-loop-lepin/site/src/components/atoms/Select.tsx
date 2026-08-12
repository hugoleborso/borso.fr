const SELECT_CLASS =
  'px-2.5 py-1.5 rounded-lg border border-line bg-bg-elev text-[13px] font-medium text-ink-2';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

interface SelectProps {
  readonly id: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onSelect: (value: string) => void;
}

// @FollowsBlueprint atom-plain
export function Select({ id, value, options, onSelect }: SelectProps) {
  return (
    <select
      id={id}
      className={SELECT_CLASS}
      value={value}
      onChange={(event) => {
        onSelect(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
