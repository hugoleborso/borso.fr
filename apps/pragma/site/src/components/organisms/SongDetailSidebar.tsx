/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  flattenMasteryRows,
  isMasteryBarFilled,
  MASTERY_BAR_COUNT,
  type SongLineupRow,
} from '../../routes/catalog/song-lineup.core';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberMark } from '../atoms/MemberMark';
import { MEMBER_LOADING_COLOR } from '../atoms/member-palette.utils';
import { MemberChip } from '../molecules/MemberChip';

const MASTERY_BAR_CLASS = 'h-3.5 min-h-0 w-1.5 min-w-0 rounded-cover px-0';
const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

interface SongDetailSidebarProps {
  readonly lineupRows: readonly SongLineupRow[];
  readonly baseEnergy: number | null;
}

const MASTERY_BAR_INDEXES = Array.from({ length: MASTERY_BAR_COUNT }, (_unused, index) => index);

// @FollowsBlueprint organism-presentational
export function SongDetailSidebar(props: SongDetailSidebarProps): JSX.Element {
  const { t } = useTranslation();
  const hasLineup = props.lineupRows.length > 0;
  const masteryRows = flattenMasteryRows(props.lineupRows);
  return (
    <aside className="flex flex-col gap-4">
      <Card>
        <div className={composeClassName(LABEL_CLASS, 'mb-2.5')}>{t('catalog.defaultLineup')}</div>
        <div className="flex flex-col gap-1.5">
          {hasLineup ? null : <span className="text-meta text-ink-soft italic">—</span>}
          {props.lineupRows.map((row) => (
            <div
              key={row.memberId}
              className="flex items-center gap-2.5 py-1.5 border-b border-dashed border-rule last:border-b-0"
            >
              <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
              <span className="text-meta text-ink flex-1">{row.memberName}</span>
              <span className="text-label uppercase tracking-wider text-ink-soft text-right">
                {row.instruments.length === 0
                  ? '—'
                  : row.instruments.map((instrument) => instrument.instrumentName).join(' + ')}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className={composeClassName(LABEL_CLASS, 'mb-2.5')}>{t('catalog.mastery')}</div>
        <div className="flex flex-col gap-2">
          {masteryRows.length === 0 ? (
            <span className="text-meta text-ink-soft italic">—</span>
          ) : null}
          {masteryRows.map((row) => (
            <div key={`${row.memberId}-${row.instrumentId}`} className="flex items-center gap-2.5">
              <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
              <span className="text-meta flex-1 min-w-0 text-ink truncate">
                {row.memberName}
                <span className="text-ink-soft"> · {row.instrumentName}</span>
              </span>
              <div className="flex gap-px">
                {MASTERY_BAR_INDEXES.map((barIndex) => (
                  <MemberMark
                    key={barIndex}
                    color={
                      isMasteryBarFilled(row.masteryScore, barIndex)
                        ? row.memberColor
                        : MEMBER_LOADING_COLOR
                    }
                    shape="cell"
                    className={MASTERY_BAR_CLASS}
                  />
                ))}
              </div>
              <span className="font-mono text-meta text-ink-soft min-w-[24px] text-right">
                {row.masteryScore === null ? '—' : `${row.masteryScore}/${MASTERY_BAR_COUNT}`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {props.baseEnergy === null ? null : (
        <Card variant="flat" className="bg-sunk border-0">
          <div className={composeClassName(LABEL_CLASS, 'mb-1.5')}>{t('catalog.baseEnergy')}</div>
          <div className="font-mono text-meta text-ink">
            {props.baseEnergy}/{MASTERY_BAR_COUNT}
          </div>
        </Card>
      )}
    </aside>
  );
}
