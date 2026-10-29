/** @Feature setlists */

import type { InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { memberInitial } from '../atoms/member-palette.utils';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface InlineLineupMemberRow {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly heldInstrumentIds: readonly string[];
  readonly isChangedTonight: boolean;
}

export interface InlineLineupInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export interface InlineLineupEditorProps {
  readonly rows: readonly InlineLineupMemberRow[];
  readonly instruments: readonly InlineLineupInstrument[];
  readonly isOverridingSong: boolean;
  readonly isFocusedOnOpen: boolean;
  readonly onToggle: (memberId: string, instrumentId: string) => void;
  readonly onUseSongLineup: () => void;
}

const CHANGED_MARK_CLASS = 'rounded-sm bg-highlight px-1.5 py-0.5 text-label text-on-highlight';

// @FollowsBlueprint molecule-presentational
export function InlineLineupEditor({
  rows,
  instruments,
  isOverridingSong,
  isFocusedOnOpen,
  onToggle,
  onUseSongLineup,
}: InlineLineupEditorProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <section aria-label={t('lineup.tonight')} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 className="m-0 text-label font-medium tracking-wider text-ink-soft uppercase">
          {t('lineup.tonight')}
        </h3>
        {isOverridingSong ? (
          <Button variant="secondary" size="sm" icon="swap" onClick={onUseSongLineup}>
            {t('lineup.useSongLineup')}
          </Button>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row, rowIndex) => (
          <li key={row.memberId} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Avatar initials={memberInitial(row.firstName)} color={row.color} size="md" />
              <span className="text-meta font-medium text-ink">{row.firstName}</span>
              {row.isChangedTonight ? (
                <span className={CHANGED_MARK_CLASS}>{t('lineup.changedTonight')}</span>
              ) : null}
            </div>
            <div
              role="group"
              aria-label={`${row.firstName} — ${t('lineup.instruments')}`}
              className="flex flex-wrap gap-1.5"
            >
              {instruments.map((instrument, instrumentIndex) => (
                <Chip
                  key={instrument.id}
                  data-sheet-focus={
                    isFocusedOnOpen && rowIndex === 0 && instrumentIndex === 0 ? true : undefined
                  }
                  pressed={row.heldInstrumentIds.includes(instrument.id)}
                  onPress={() => onToggle(row.memberId, instrument.id)}
                >
                  <Icon name={INSTRUMENT_ICON_GLYPH[instrument.icon]} />
                  {instrument.name}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
