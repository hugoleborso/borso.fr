/** @Feature instruments */

import { INSTRUMENT_ICONS, type InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
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
  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {INSTRUMENT_ICONS.map((icon) => (
        <IconButton
          key={icon}
          variant="secondary"
          icon={INSTRUMENT_ICON_GLYPH[icon]}
          label={labelOf(icon)}
          aria-pressed={value === icon}
          onClick={() => onPick(icon)}
        />
      ))}
    </div>
  );
}
