import type { JSX } from 'react';
import { type Key, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { chipVariants } from '../atoms/chip.variants';

export interface InstrumentToggleOption {
  readonly id: string;
  readonly name: string;
}

export interface InstrumentToggleGroupProps {
  readonly label: string;
  readonly instruments: readonly InstrumentToggleOption[];
  readonly selectedIds: readonly string[];
  readonly onChange: (selectedIds: string[]) => void;
}

const CHIP_CLASS = chipVariants({ tone: 'choice', size: 'md' });

// @FollowsBlueprint molecule-presentational
export function InstrumentToggleGroup({
  label,
  instruments,
  selectedIds,
  onChange,
}: InstrumentToggleGroupProps): JSX.Element {
  const choose = (keys: ReadonlySet<Key>): void => {
    onChange(
      instruments
        .filter((instrument) => keys.has(instrument.id))
        .map((instrument) => instrument.id),
    );
  };
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="multiple"
      selectedKeys={selectedIds}
      onSelectionChange={choose}
      className="flex flex-wrap gap-2"
    >
      {instruments.map((instrument) => (
        <ToggleButton key={instrument.id} id={instrument.id} className={CHIP_CLASS}>
          {instrument.name}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
