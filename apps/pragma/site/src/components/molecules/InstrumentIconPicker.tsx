/** @Feature instruments */

import { INSTRUMENT_ICONS, type InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { type Key, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { IconButton } from '../atoms/IconButton';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface InstrumentIconPickerProps {
  readonly value: InstrumentIcon;
  readonly labelOf: (icon: InstrumentIcon) => string;
  readonly onPick: (icon: InstrumentIcon) => void;
}

// @FollowsBlueprint molecule-presentational
export function InstrumentIconPicker({
  value,
  labelOf,
  onPick,
}: InstrumentIconPickerProps): JSX.Element {
  const pick = (keys: ReadonlySet<Key>): void => {
    const picked = INSTRUMENT_ICONS.find((icon) => keys.has(icon));
    if (picked !== undefined) onPick(picked);
  };
  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={pick}
      className="flex flex-wrap gap-1.5"
    >
      {INSTRUMENT_ICONS.map((icon) => (
        <ToggleButton
          key={icon}
          id={icon}
          render={({ children: _selectionState, className: _ariaClassName, ...toggleProps }) => (
            <IconButton
              {...toggleProps}
              variant="secondary"
              icon={INSTRUMENT_ICON_GLYPH[icon]}
              label={labelOf(icon)}
            />
          )}
        />
      ))}
    </ToggleButtonGroup>
  );
}
