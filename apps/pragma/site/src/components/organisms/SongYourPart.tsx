/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { MASTERY_BAR_COUNT, type SongLineupRow } from '../../routes/catalog/song-lineup.core';
import { Card } from '../atoms/Card';
import { MemberChip } from '../molecules/MemberChip';

export interface SongYourPartProps {
  readonly row: SongLineupRow | null;
}

// @FollowsBlueprint organism-presentational
export function SongYourPart({ row }: SongYourPartProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card>
      <h2 className="m-0 mb-2.5 text-label font-medium tracking-wider text-ink-soft uppercase">
        {t('catalog.yourPart')}
      </h2>
      {row === null || row.instruments.length === 0 ? (
        <p className="m-0 text-meta text-ink-soft">{t('catalog.yourPartNone')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {row.instruments.map((instrument) => (
            <li key={instrument.instrumentId} className="flex items-center gap-2.5">
              <MemberChip memberName={row.memberName} memberColor={row.memberColor} />
              <span className="flex-1 text-body text-ink">{instrument.instrumentName}</span>
              <span className="rounded-sm bg-highlight px-2 py-0.5 font-mono text-meta text-on-highlight">
                {instrument.masteryScore === null
                  ? t('catalog.yourPartNoScore')
                  : `${instrument.masteryScore}/${MASTERY_BAR_COUNT}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
