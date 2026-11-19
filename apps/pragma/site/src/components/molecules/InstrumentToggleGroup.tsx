import type { InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { type Key, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { chipVariants } from '../atoms/chip.variants';
import { Icon } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH, selectInstrumentIdsNamedInWords } from './lineup-slots.core';

export interface InstrumentToggleOption {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
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
  const namedInWords = selectInstrumentIdsNamedInWords(instruments);
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="multiple"
      selectedKeys={selectedIds}
      onSelectionChange={choose}
      className="flex flex-wrap gap-2"
    >
      {instruments.map((instrument) => (
        <ToggleButton
          key={instrument.id}
          id={instrument.id}
          aria-label={instrument.name}
          className={CHIP_CLASS}
        >
          <span title={instrument.name} className="inline-flex items-center gap-1.5">
            <Icon name={INSTRUMENT_ICON_GLYPH[instrument.icon]} />
            {namedInWords.has(instrument.id) ? instrument.name : null}
          </span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
