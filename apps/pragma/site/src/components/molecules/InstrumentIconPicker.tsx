/** @Feature instruments */

import { INSTRUMENT_ICONS, type InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

const PICKER_ICON_SIZE_PX = 20;
const PICKED_CLASS = 'bg-accent-soft border-accent text-accent';
const UNPICKED_CLASS = 'bg-bg border-line text-ink-500 hover:border-line-strong';

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
        <button
          key={icon}
          type="button"
          aria-pressed={value === icon}
          aria-label={labelOf(icon)}
          title={labelOf(icon)}
          onClick={() => onPick(icon)}
          className={composeClassName(
            'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border transition-colors',
            value === icon ? PICKED_CLASS : UNPICKED_CLASS,
          )}
        >
          <Icon name={INSTRUMENT_ICON_GLYPH[icon]} size={PICKER_ICON_SIZE_PX} />
        </button>
      ))}
    </div>
  );
}
