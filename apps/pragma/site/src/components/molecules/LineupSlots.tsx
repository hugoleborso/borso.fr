/** @Feature setlists */

import type { JSX } from 'react';
import { Icon } from '../atoms/Icon';
import { type LineupSlotsView, slotTintColor } from './lineup-slots.core';

const LINEUP_SLOT_ICON_SIZE_PX = 17;
const SLOT_CLASS = 'inline-flex h-5 w-[19px] items-center justify-center';

export interface LineupSlotsProps {
  readonly view: LineupSlotsView;
  readonly overflowTitle: string;
}

// @FollowsBlueprint molecule-presentational
export function LineupSlots({ view, overflowTitle }: LineupSlotsProps): JSX.Element {
  return (
    <span className="inline-flex shrink-0 items-center">
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
          className="inline-flex h-5 items-center px-0.5 font-mono text-[10px] text-ink-400"
          title={overflowTitle}
        >
          +{view.overflowCount}
        </span>
      ) : null}
    </span>
  );
}
