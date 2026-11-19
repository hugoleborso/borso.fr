/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongLineupRow } from '../../routes/catalog/song-lineup.core';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH, selectInstrumentIdsNamedInWords } from './lineup-slots.core';
import { MemberChip } from './MemberChip';
import { NoLineupNotice } from './NoLineupNotice';

export interface SongLineupChipsProps {
  readonly rows: readonly SongLineupRow[];
  readonly onEdit: () => void;
}

// @FollowsBlueprint molecule-presentational
export function SongLineupChips({ rows, onEdit }: SongLineupChipsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <section aria-label={t('catalog.defaultLineup')} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-label tracking-wider uppercase text-ink-soft font-medium">
          {t('catalog.defaultLineup')}
        </h2>
        <Button variant="quiet" size="sm" icon="edit" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      </div>
      {rows.length === 0 ? (
        <NoLineupNotice />
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {rows.map((row) => {
            const namedInWords = selectInstrumentIdsNamedInWords(
              row.instruments.map((instrument) => ({
                id: instrument.instrumentId,
                icon: instrument.icon,
              })),
            );
            return (
              <li key={row.memberId}>
                <Chip className="py-1 pl-1 pr-2.5 text-meta text-ink">
                  <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
                  {row.instruments.map((instrument) => (
                    <span
                      key={instrument.instrumentId}
                      role="img"
                      aria-label={instrument.instrumentName}
                      title={instrument.instrumentName}
                      className="inline-flex items-center gap-1"
                    >
                      <Icon name={INSTRUMENT_ICON_GLYPH[instrument.icon]} />
                      {namedInWords.has(instrument.instrumentId) ? instrument.instrumentName : null}
                    </span>
                  ))}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
