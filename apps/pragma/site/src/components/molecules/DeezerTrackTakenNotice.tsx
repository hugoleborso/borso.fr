/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';
import type { TakenDeezerTrack } from '../../lib/queries/song-save-refusal.core';

interface DeezerTrackTakenNoticeProps {
  readonly takenTrack: TakenDeezerTrack;
}

export function DeezerTrackTakenNotice({ takenTrack }: DeezerTrackTakenNoticeProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <p
      className="text-danger text-meta border border-danger/40 rounded-md px-3 py-2 flex flex-wrap items-center gap-2"
      role="alert"
    >
      <Icon name="warn" size="sm" />
      {t('catalog.deezerTrackTaken')}
      <Link to={`/catalog/${takenTrack.songId}`} className="underline font-medium">
        {takenTrack.songTitle}
      </Link>
    </p>
  );
}
