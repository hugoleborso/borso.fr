import type { JSX } from 'react';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';

export interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export interface SegmentedFilterProps<Value extends string> {
  readonly label: string;
  readonly options: readonly SegmentedOption<Value>[];
  readonly selected: Value;
  readonly onSelected: (value: Value) => void;
}

// @FollowsBlueprint molecule-presentational
export function SegmentedFilter<Value extends string>({
  label,
  options,
  selected,
  onSelected,
}: SegmentedFilterProps<Value>): JSX.Element {
  return (
    <div role="group" aria-label={label} className="flex gap-1 p-1 rounded-md bg-sunk">
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Button
            key={option.value}
            variant="quiet"
            size="md"
            aria-pressed={isSelected}
            onClick={() => onSelected(option.value)}
            className={composeClassName(
              'flex-1',
              isSelected ? 'bg-surface-raised text-ink shadow-1' : 'text-ink-muted',
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
