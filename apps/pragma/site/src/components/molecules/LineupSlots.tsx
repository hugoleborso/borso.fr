/** @Feature setlists */

import { type JSX, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { MemberMark } from '../atoms/MemberMark';
import { useElementWidth } from './element-width.hook';
import {
  type LineupColumnKind,
  type LineupColumnView,
  selectLineupColumnKind,
  sliceColumnToWidth,
} from './lineup-slots.core';
import { NoLineupNotice } from './NoLineupNotice';

const OVERFLOW_NAME_SEPARATOR = ', ';
const SLOT_CLASS = 'size-5.5 min-h-0 min-w-0 px-0';
const COLUMN_CLASS = 'inline-flex h-6 min-w-0 flex-1 items-center gap-0.5 overflow-hidden';

export interface LineupSlotsProps {
  readonly column: LineupColumnView;
}

function FilledLineupSlots({ column }: LineupSlotsProps): JSX.Element {
  const [measuredColumn, setMeasuredColumn] = useState<HTMLSpanElement | null>(null);
  const view = sliceColumnToWidth(column, useElementWidth(measuredColumn));
  return (
    <span ref={setMeasuredColumn} className={COLUMN_CLASS}>
      {view.slots.map((slot) => (
        <MemberMark
          key={slot.slotKey}
          shape="cell"
          color={slot.holderColor}
          className={SLOT_CLASS}
          title={slot.instrumentName}
        >
          <Icon name={slot.glyph} />
        </MemberMark>
      ))}
      {view.hasOverflow ? (
        <span
          className="inline-flex h-6 shrink-0 items-center px-0.5 text-label text-ink-soft tabular-nums"
          title={view.overflowInstrumentNames.join(OVERFLOW_NAME_SEPARATOR)}
        >
          +{view.overflowCount}
        </span>
      ) : null}
    </span>
  );
}

const LINEUP_BY_KIND = {
  empty: NoLineupNotice,
  filled: FilledLineupSlots,
} as const satisfies Record<LineupColumnKind, (props: LineupSlotsProps) => JSX.Element>;

// @FollowsBlueprint molecule-view-selector
export function LineupSlots({ column }: LineupSlotsProps): JSX.Element {
  const Lineup = LINEUP_BY_KIND[selectLineupColumnKind(column)];
  return <Lineup column={column} />;
}
