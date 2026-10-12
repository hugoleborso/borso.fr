/** @Feature setlists */

import type { JSX } from 'react';
import type { InstrumentIcon } from '@domain/instrument.core';
import { Icon } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface MemberPartGlyph {
  readonly instrumentId: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly isNameNeeded: boolean;
}

export interface MemberPartGlyphsProps {
  readonly parts: readonly MemberPartGlyph[];
  readonly size: number;
}

// @FollowsBlueprint molecule-presentational
export function MemberPartGlyphs({ parts, size }: MemberPartGlyphsProps): JSX.Element {
  return (
    <span className="flex min-w-0 items-center gap-2 text-accent">
      {parts.map((part) => (
        <span
          key={part.instrumentId}
          role="img"
          aria-label={part.name}
          title={part.name}
          className="inline-flex shrink-0 items-center gap-1"
        >
          <Icon name={INSTRUMENT_ICON_GLYPH[part.icon]} size={size} />
          {part.isNameNeeded ? (
            <span aria-hidden="true" className="font-mono text-[11px] uppercase tracking-wider">
              {part.name}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
