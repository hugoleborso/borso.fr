/** @Feature sketches */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlbumCover } from '../atoms/AlbumCover';
import { HintText } from '../atoms/HintText';
import { SongActionRow } from '../molecules/PickableSongRow';
import { Sheet } from '../molecules/Sheet';
import type { InspirationCardView } from '../../routes/inspirations/inspirations-page.core';

export interface InspirationPickerSheetProps {
  readonly inspirations: readonly InspirationCardView[];
  readonly onPick: (inspirationId: string) => void;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function InspirationPickerSheet({
  inspirations,
  onPick,
  onClose,
}: InspirationPickerSheetProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Sheet title={t('sketch.addClipTitle')} label={t('sketch.addClipTitle')} onClose={onClose}>
      {inspirations.length > 0 ? null : (
        <div className="flex flex-col items-start gap-2">
          <HintText tone="muted">{t('sketch.emptyLibrary')}</HintText>
          <Link
            to="/inspirations"
            className="inline-flex min-h-11 items-center text-meta text-accent"
          >
            {t('sketch.openLibrary')}
          </Link>
        </div>
      )}
      <ul className="m-0 flex list-none flex-col p-0" aria-label={t('inspirations.title')}>
        {inspirations.map((inspiration) => (
          <li key={inspiration.id}>
            <SongActionRow
              title={inspiration.title}
              detail={inspiration.detailLabel}
              leading={
                <AlbumCover title={inspiration.title} deezerAlbumId={inspiration.deezerAlbumId} />
              }
              isDisabled={false}
              onSelect={() => onPick(inspiration.id)}
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
