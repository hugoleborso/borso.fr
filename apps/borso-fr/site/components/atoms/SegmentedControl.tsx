export type SegmentedControlLayout = 'four' | 'five' | 'auto';

const LAYOUT_CLASS_BY_LAYOUT: Readonly<Record<SegmentedControlLayout, string>> = {
  four: ' four',
  five: ' five',
  auto: '',
};

const SELECTED_CLASS_BY_SELECTION: Readonly<Record<`${boolean}`, string>> = {
  true: ' on',
  false: '',
};

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  onValueChange: (nextValue: Value) => void;
  layout: SegmentedControlLayout;
  legend: string;
}

export function SegmentedControl<Value extends string>({
  options,
  value,
  onValueChange,
  layout,
  legend,
}: SegmentedControlProps<Value>) {
  return (
    <fieldset className={`segments${LAYOUT_CLASS_BY_LAYOUT[layout]}`}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            className={`seg${SELECTED_CLASS_BY_SELECTION[`${isSelected}`]}`}
            onClick={() => onValueChange(option.value)}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
