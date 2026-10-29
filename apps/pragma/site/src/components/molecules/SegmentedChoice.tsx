import type { JSX } from 'react';
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
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex rounded-pill bg-glass">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              className={composeClassName(
                'flex min-h-11 cursor-pointer items-center rounded-pill px-3 text-meta font-medium leading-none whitespace-nowrap',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
                isSelected ? 'bg-ink text-paper' : 'text-ink hover:bg-hover',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                checked={isSelected}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
