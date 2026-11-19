/** @Feature setlists */

import type { JSX } from 'react';
import type { InstrumentIcon } from '@domain/instrument.core';
import { Icon, type IconSize } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface HeldInstrumentGlyph {
  readonly instrumentId: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly isNameNeeded: boolean;
}

export interface HeldInstrumentGlyphsProps {
  readonly instruments: readonly HeldInstrumentGlyph[];
  readonly size: IconSize;
}

// @FollowsBlueprint molecule-presentational
export function HeldInstrumentGlyphs({
  instruments,
  size,
}: HeldInstrumentGlyphsProps): JSX.Element {
  return (
    <span className="flex min-w-0 items-center gap-2 text-accent">
      {instruments.map((instrument) => (
        <span
          key={instrument.instrumentId}
          role="img"
          aria-label={instrument.name}
          title={instrument.name}
          className="inline-flex shrink-0 items-center gap-1"
        >
          <Icon name={INSTRUMENT_ICON_GLYPH[instrument.icon]} size={size} />
          {instrument.isNameNeeded ? (
            <span aria-hidden="true" className="text-label tracking-wider uppercase">
              {instrument.name}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
