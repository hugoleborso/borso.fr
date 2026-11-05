/** @Feature setlists */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { MemberMark } from '../atoms/MemberMark';
import { useElementWidth } from './element-width.hook';
import { type LineupColumnView, sliceColumnToWidth } from './lineup-slots.core';

const OVERFLOW_NAME_SEPARATOR = ', ';
const SLOT_CLASS = 'size-5.5 min-h-0 min-w-0 px-0';
const COLUMN_CLASS = 'inline-flex h-6 min-w-0 flex-1 items-center gap-0.5 overflow-hidden';
const EMPTY_CLASS =
  'inline-flex h-6 shrink-0 items-center gap-1 text-label whitespace-nowrap text-warn';

export interface LineupSlotsProps {
  readonly column: LineupColumnView;
}

// @FollowsBlueprint molecule-presentational
export function LineupSlots({ column }: LineupSlotsProps): JSX.Element {
  const { t } = useTranslation();
  const [measuredColumn, setMeasuredColumn] = useState<HTMLSpanElement | null>(null);
  const view = sliceColumnToWidth(column, useElementWidth(measuredColumn));
  if (column.slots.length === 0) {
    return (
      <span className={EMPTY_CLASS}>
        <Icon name="warn" />
        {t('lineup.noLineup')}
      </span>
    );
  }
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
