/** @Feature songs */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongNoteInput } from '../../routes/catalog/song-notes.core';
import { RoundAction } from '../atoms/RoundAction';
import { SongNotesSheet } from './SongNotesSheet';

export interface SongRoundActionsProps {
  readonly songId: string;
  readonly notes: SongNoteInput;
}

// @FollowsBlueprint organism-query-owning
export function SongRoundActions({ songId, notes }: SongRoundActionsProps): JSX.Element {
  const { t } = useTranslation();
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  return (
    <div className="flex items-start justify-around gap-2 sm:justify-start sm:gap-6">
      <RoundAction
        kind="button"
        icon="comment"
        label={t('catalog.commentsTitle')}
        onPress={() => setIsNotesOpen(true)}
      />
      <RoundAction
        kind="link"
        icon="expand"
        label={t('catalog.fullScreen')}
        to={`/catalog/${songId}/scene`}
      />
      {isNotesOpen ? (
        <SongNotesSheet songId={songId} notes={notes} onClose={() => setIsNotesOpen(false)} />
      ) : null}
    </div>
  );
}
