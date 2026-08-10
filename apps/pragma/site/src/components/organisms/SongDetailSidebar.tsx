/**
 * The sidebar of the song detail page: who plays what by default, how well
 * each of them plays it, and the song's base energy.
 *
 * All three cards read the same resolved lineup rows, so the route hands over
 * one list rather than three raw lookups.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isMasteryBarFilled,
  MASTERY_BAR_COUNT,
  type SongLineupRow,
} from '../../routes/catalog/song-lineup.core';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MemberChip } from '../molecules/MemberChip';

const FILLED_BAR_OPACITY = 0.85;
const EMPTY_BAR_OPACITY = 1;
const EMPTY_BAR_COLOR = 'var(--color-bg-sunk)';
const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

interface SongDetailSidebarProps {
  readonly lineupRows: readonly SongLineupRow[];
  readonly baseEnergy: number | null;
  readonly onEditDefaultLineup: () => void;
}

const MASTERY_BAR_INDEXES = Array.from({ length: MASTERY_BAR_COUNT }, (_unused, index) => index);

export function SongDetailSidebar(props: SongDetailSidebarProps): JSX.Element {
  const { t } = useTranslation();
  const hasLineup = props.lineupRows.length > 0;
  return (
    <aside className="flex flex-col gap-4">
      <Card>
        <div
          className={composeClassName(
            LABEL_CLASS,
            'mb-2.5 flex items-center justify-between gap-2',
          )}
        >
          <span>{t('catalog.defaultLineup')}</span>
          <Button type="button" variant="ghost" size="sm" onClick={props.onEditDefaultLineup}>
            <Icon name="edit" size={12} />
            {t('lineup.editDefault')}
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          {hasLineup ? null : <span className="text-xs text-ink-400 italic">—</span>}
          {props.lineupRows.map((row) => (
            <div
              key={row.memberId}
              className="flex items-center gap-2.5 py-1.5 border-b border-dashed border-line last:border-b-0"
            >
              <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
              <span className="text-[12.5px] text-ink-900 flex-1">{row.memberName}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-500">
                {row.instrumentName ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className={composeClassName(LABEL_CLASS, 'mb-2.5')}>{t('catalog.mastery')}</div>
        <div className="flex flex-col gap-2">
          {hasLineup ? null : <span className="text-xs text-ink-400 italic">—</span>}
          {props.lineupRows.map((row) => (
            <div key={row.memberId} className="flex items-center gap-2.5">
              <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
              <span className="text-[12.5px] flex-1 text-ink-900">{row.memberName}</span>
              <div className="flex gap-px">
                {MASTERY_BAR_INDEXES.map((barIndex) => (
                  <span
                    key={barIndex}
                    className="w-1.5 h-3.5 rounded-[1px]"
                    style={{
                      background: isMasteryBarFilled(row.masteryScore, barIndex)
                        ? row.memberColor
                        : EMPTY_BAR_COLOR,
                      opacity: isMasteryBarFilled(row.masteryScore, barIndex)
                        ? FILLED_BAR_OPACITY
                        : EMPTY_BAR_OPACITY,
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] text-ink-400 min-w-[24px] text-right">
                {row.masteryScore === null ? '—' : `${row.masteryScore}/${MASTERY_BAR_COUNT}`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {props.baseEnergy === null ? null : (
        <Card variant="flat" className="bg-bg-sunk border-0">
          <div className={composeClassName(LABEL_CLASS, 'mb-1.5')}>{t('catalog.baseEnergy')}</div>
          <div className="font-mono text-[14px] text-ink-700">
            {props.baseEnergy}/{MASTERY_BAR_COUNT}
          </div>
        </Card>
      )}
    </aside>
  );
}
