import clsx from 'clsx';

export interface SegmentedOption<TValue> {
  readonly value: TValue;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SegmentedChoiceProps<TValue> {
  readonly options: readonly SegmentedOption<TValue>[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
  readonly legend: string;
}

/**
 * @Blueprint molecule-choice-without-a-select
 * @BlueprintName Molecule Choice Without A Select
 * @BlueprintUsage Use for a short closed list of options on a screen meant for a thumb, where a native select would open a wheel over the whole page.
 * @BlueprintDescription Renders the options as radio inputs inside a fieldset so the keyboard and assistive technology get a real group with a legend, then hides the inputs and styles the labels, which is what keeps the component accessible while looking nothing like a form control. Every option is a tap target of its own rather than one control that opens a list, so choosing takes one touch instead of three, and the whole set stays visible while the player decides.
 */
export function SegmentedChoice<TValue extends string | number>({
  options,
  value,
  onChange,
  legend,
}: SegmentedChoiceProps<TValue>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={clsx(
                'flex min-h-11 cursor-pointer items-center rounded-pill border-[3px] border-ink px-4 py-2 text-sm font-extrabold has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                isSelected ? 'bg-peel shadow-chunk-sm' : 'bg-cream',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                checked={isSelected}
                disabled={option.disabled ?? false}
                onChange={() => {
                  onChange(option.value);
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
