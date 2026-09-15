/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isSongNewSinceLastScore,
  judgeTap,
  readGivenPoints,
  readIntentPoints,
  type ReleaseIntent,
} from '../../routes/setlists/vote-deck.core';
import { VoteCatalogRow } from '../molecules/VoteCatalogRow';
import type { DeckSong } from './VoteDeck';

export interface VoteCatalogProps {
  readonly songs: readonly DeckSong[];
  readonly lastScoredAt: string | null;
  readonly remainingPoints: number;
  readonly pointsBySongId: Readonly<Record<string, number>>;
  readonly onScore: (songId: string, points: number) => void;
  readonly onExhausted: () => void;
}

// @FollowsBlueprint organism-mutation-panel
export function VoteCatalog({
  songs,
  lastScoredAt,
  remainingPoints,
  pointsBySongId,
  onScore,
  onExhausted,
}: VoteCatalogProps): JSX.Element {
  const { t } = useTranslation();

  const applyTap: Readonly<
    Record<ReleaseIntent['kind'], (songId: string, points: number) => void>
  > = {
    refused: () => {
      onExhausted();
    },
    return: () => undefined,
    score: (songId, points) => {
      onScore(songId, points);
    },
  };

  if (songs.length === 0) {
    return <p className="px-4 text-ink-500">{t('voting.deckDone')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2 px-4 m-0 p-0 list-none">
      {songs.map((song) => {
        const points = readGivenPoints(pointsBySongId, song.id);
        return (
          <VoteCatalogRow
            key={song.id}
            title={song.title}
            artist={song.artist}
            releaseId={song.releaseId}
            points={points}
            isNew={isSongNewSinceLastScore(song, lastScoredAt, points)}
            onTap={() => {
              const intent = judgeTap(points, remainingPoints);
              applyTap[intent.kind](song.id, readIntentPoints(intent));
            }}
          />
        );
      })}
    </ul>
  );
}
