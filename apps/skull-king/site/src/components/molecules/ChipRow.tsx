import { listChipValues, selectChipColumns, selectChipState } from '@site/lib/chip-layout.core';
import { NumberChip } from '../atoms/NumberChip';

export interface ChipRowProps {
  readonly label: string;
  readonly highest: number;
  readonly chosen: number | null;
  readonly blocked: number | null;
  readonly tone: 'accent' | 'missed';
  readonly surface: 'ground' | 'card';
  readonly onPick: (value: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function ChipRow(props: ChipRowProps) {
  const values = listChipValues(props.highest);
  return (
    <div
      role="group"
      aria-label={props.label}
      className="grid min-w-0 flex-1 gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${selectChipColumns(values.length)}, minmax(0, 3rem))`,
      }}
    >
      {values.map((value) => (
        <NumberChip
          key={value}
          value={value}
          state={selectChipState(props, value)}
          onPick={props.onPick}
        />
      ))}
    </div>
  );
}
