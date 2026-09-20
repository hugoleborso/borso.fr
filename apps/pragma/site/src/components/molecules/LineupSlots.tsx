/** @Feature setlists */

import { type JSX, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useElementWidth } from './element-width.hook';
import { type LineupColumnView, sliceColumnToWidth, slotTintColor } from './lineup-slots.core';

const LINEUP_SLOT_ICON_SIZE_PX = 17;
const OVERFLOW_NAME_SEPARATOR = ', ';
const SLOT_CLASS = 'inline-flex h-5 w-[19px] shrink-0 items-center justify-center';
const COLUMN_CLASS = 'inline-flex h-5 min-w-0 flex-1 items-center overflow-hidden';

export interface LineupSlotsProps {
  readonly column: LineupColumnView;
}

// @FollowsBlueprint molecule-presentational
export function LineupSlots({ column }: LineupSlotsProps): JSX.Element {
  const [measuredColumn, setMeasuredColumn] = useState<HTMLSpanElement | null>(null);
  const view = sliceColumnToWidth(column, useElementWidth(measuredColumn));
  return (
    <span ref={setMeasuredColumn} className={COLUMN_CLASS}>
      {view.slots.map((slot) => (
        <span
          key={slot.instrumentId}
          className={SLOT_CLASS}
          style={{ color: slotTintColor(slot.holderColor) }}
          title={slot.instrumentName}
        >
          <Icon name={slot.glyph} size={LINEUP_SLOT_ICON_SIZE_PX} />
        </span>
      ))}
      {view.hasOverflow ? (
        <span
          className="inline-flex h-5 shrink-0 items-center px-0.5 font-mono text-[10px] text-ink-400"
          title={view.overflowInstrumentNames.join(OVERFLOW_NAME_SEPARATOR)}
        >
          +{view.overflowCount}
        </span>
      ) : null}
    </span>
  );
}
