import clsx from 'clsx';

export type SegmentedControlLayout = 'four' | 'five' | 'auto';

const LAYOUT_CLASS_BY_LAYOUT: Readonly<Record<SegmentedControlLayout, string>> = {
  four: 'grid-cols-[repeat(2,1fr)] [&>button:nth-child(2)]:border-r-0 [&>button:nth-child(-n+2)]:border-b atelier-quad:grid-cols-[repeat(4,1fr)] atelier-quad:[&>button:nth-child(2)]:border-r atelier-quad:[&>button:nth-child(-n+2)]:border-b-0',
  five: 'grid-cols-[repeat(2,1fr)] [&>button:last-child]:col-span-full [&>button:nth-child(2n)]:border-r-0 [&>button:nth-child(-n+4)]:border-b atelier-quint:grid-cols-[repeat(5,1fr)] atelier-quint:[&>button:last-child]:col-span-1 atelier-quint:[&>button:nth-child(2n)]:border-r atelier-quint:[&>button:nth-child(-n+4)]:border-b-0',
  auto: 'grid-cols-[repeat(2,1fr)]',
};

const SEGMENTS_CLASS_NAME = 'm-0 grid gap-0 border border-atelier-rule-strong p-0';

const SEGMENT_CLASS_NAME =
  'cursor-pointer border-r border-b-atelier-rule border-r-atelier-rule px-1 py-2.5 font-atelier-serif text-[12px] italic transition-[background-color,color] duration-[160ms] last:border-r-0 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-atelier-ink atelier-roomy:px-1.5 atelier-roomy:text-[14px] [@media(hover:none)]:min-h-11';

const SELECTED_CLASS_BY_SELECTION: Readonly<Record<`${boolean}`, string>> = {
  true: 'bg-atelier-ink text-atelier-paper',
  false: 'bg-transparent text-atelier-ink-soft hover:bg-atelier-ink/[0.04]',
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

// @FollowsBlueprint atom-plain
export function SegmentedControl<Value extends string>({
  options,
  value,
  onValueChange,
  layout,
  legend,
}: SegmentedControlProps<Value>) {
  return (
    <fieldset className={clsx(SEGMENTS_CLASS_NAME, LAYOUT_CLASS_BY_LAYOUT[layout])}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            className={clsx(SEGMENT_CLASS_NAME, SELECTED_CLASS_BY_SELECTION[`${isSelected}`])}
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
