/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongLineupRow } from '../../routes/catalog/song-lineup.core';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { memberInitial } from '../atoms/member-palette.utils';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';
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
          {rows.map((row) => (
            <li key={row.memberId}>
              <Chip className="py-1 pl-1 pr-2.5 text-meta text-ink">
                <Avatar initials={memberInitial(row.memberName)} color={row.memberColor} />
                {row.memberName}
                {row.instruments.map((instrument) => (
                  <Icon
                    key={instrument.instrumentId}
                    name={INSTRUMENT_ICON_GLYPH[instrument.icon]}
                    role="img"
                    aria-hidden={false}
                    aria-label={instrument.instrumentName}
                  />
                ))}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
