import type { JSX } from 'react';
import { RadioButton, RadioField, RadioGroup } from 'react-aria-components';
import { composeClassName } from '../atoms/class-name.utils';

export interface SegmentedOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

export interface SegmentedChoiceProps<TValue extends string> {
  readonly legend: string;
  readonly options: readonly SegmentedOption<TValue>[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
}

// @FollowsBlueprint molecule-choice-without-a-select
export function SegmentedChoice<TValue extends string>({
  legend,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<TValue>): JSX.Element {
  const choose = (chosen: string): void => {
    const option = options.find((candidate) => candidate.value === chosen);
    if (option !== undefined) onChange(option.value);
  };
  return (
    <RadioGroup
      aria-label={legend}
      value={value}
      onChange={choose}
      orientation="horizontal"
      className="m-0 min-w-0 border-0 p-0"
    >
      <div className="inline-flex rounded-pill bg-glass">
        {options.map((option) => (
          <RadioField key={option.value} value={option.value}>
            <RadioButton
              className={({ isSelected }) =>
                composeClassName(
                  'flex min-h-11 cursor-pointer items-center rounded-pill px-3 text-meta font-medium leading-none whitespace-nowrap',
                  'data-focus-visible:outline-3 data-focus-visible:outline-focus',
                  isSelected ? 'bg-ink text-paper' : 'text-ink hover:bg-hover',
                )
              }
            >
              {option.label}
            </RadioButton>
          </RadioField>
        ))}
      </div>
    </RadioGroup>
  );
}
