/** @Feature setlist-voting */

import clsx from 'clsx';
import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DeckGeometry,
  type DeckZone,
  IDLE_OFFSET,
  isSongNewSinceLastScore,
  judgeRelease,
  readIntentPoints,
  type ReleaseIntent,
  readGivenPoints,
  type PointerPoint,
  selectCardRotation,
  selectCardTransitionClass,
  selectDiscardTint,
  selectOffsetFromOrigin,
  selectNextCardIndex,
  selectScoringTint,
  selectTintTransitionClass,
  selectZoneForOffset,
  SCORING_ZONES,
} from '../../routes/setlists/vote-deck.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { Badge } from '../atoms/Badge';
import { PointsBadge } from '../atoms/PointsBadge';

export interface DeckSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly deezerTrackId: string | null;
  readonly createdAt: string;
}

export interface VoteDeckProps {
  readonly songs: readonly DeckSong[];
  readonly lastScoredAt: string | null;
  readonly remainingPoints: number;
  readonly pointsBySongId: Readonly<Record<string, number>>;
  readonly cardIndex: number;
  readonly onAdvance: (nextIndex: number) => void;
  readonly onScore: (songId: string, points: number) => void;
  readonly onExhausted: () => void;
}

const UNKNOWN_GEOMETRY: DeckGeometry = { width: 1, height: 1 };

// @FollowsBlueprint organism-mutation-panel
export function VoteDeck({
  songs,
  lastScoredAt,
  remainingPoints,
  pointsBySongId,
  cardIndex,
  onAdvance,
  onScore,
  onExhausted,
}: VoteDeckProps): JSX.Element {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState<PointerPoint>(IDLE_OFFSET);
  const [offset, setOffset] = useState<{ x: number; y: number }>(IDLE_OFFSET);
  const [geometry, setGeometry] = useState<DeckGeometry>(UNKNOWN_GEOMETRY);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const song = songs[cardIndex];
  const hasDeckLeft = song !== undefined;
  const zone: DeckZone = isDragging ? selectZoneForOffset(offset, geometry) : 'none';
  const givenPoints = readGivenPoints(pointsBySongId, song?.id ?? '');
  const isNewSong = song !== undefined && isSongNewSinceLastScore(song, lastScoredAt, givenPoints);
  const tintTransition = selectTintTransitionClass(isDragging);
  const cardTransition = selectCardTransitionClass(isDragging);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGeometry({ width: box.width, height: box.height });
    setOrigin({ x: event.clientX, y: event.clientY });
    setIsDragging(true);
    setOffset(IDLE_OFFSET);
  }

  function trackDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setOffset(selectOffsetFromOrigin(origin, { x: event.clientX, y: event.clientY }));
  }

  const applyRelease: Readonly<Record<ReleaseIntent['kind'], (points: number) => void>> = {
    refused: () => {
      onExhausted();
    },
    return: () => undefined,
    score: (points) => {
      if (song === undefined) return;
      onScore(song.id, points);
      onAdvance(selectNextCardIndex(cardIndex, songs.length));
    },
  };

  function endDrag() {
    const intent = judgeRelease(selectZoneForOffset(offset, geometry), remainingPoints);
    setIsDragging(false);
    setOffset(IDLE_OFFSET);
    applyRelease[intent.kind](readIntentPoints(intent));
  }

  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-[4/3] select-none">
      <div className="absolute inset-y-0 right-0 w-1/2 flex flex-col pointer-events-none">
        {SCORING_ZONES.map((scoring) => (
          <div
            key={scoring.zone}
            data-zone={scoring.zone}
            className={clsx(
              'flex-1 flex items-center justify-end pr-4 rounded-r-2xl bg-accent',
              tintTransition,
            )}
            style={{ opacity: selectScoringTint(zone, scoring.zone, offset, geometry) }}
          >
            <PointsBadge points={scoring.points} />
          </div>
        ))}
      </div>
      <div
        data-zone="discard"
        className={clsx(
          'absolute inset-y-0 left-0 w-1/2 pointer-events-none rounded-l-2xl bg-ink-400',
          tintTransition,
        )}
        style={{ opacity: selectDiscardTint(zone, offset, geometry) }}
      />
      {hasDeckLeft ? (
        <div
          role="group"
          aria-label={t('voting.cardLabel')}
          className={clsx(
            'absolute inset-0 touch-none rounded-2xl border border-line bg-surface p-4 flex flex-col justify-between shadow-lg cursor-grab',
            cardTransition,
          )}
          style={{
            transform: `translate(${String(offset.x)}px, ${String(offset.y)}px) rotate(${String(selectCardRotation(offset))}deg)`,
          }}
          onPointerDown={startDrag}
          onPointerMove={trackDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlbumCover title={song.title} deezerAlbumId={song.deezerAlbumId} size="lg" />
            <div className="min-w-0">
              {isNewSong ? <Badge tone="accent">{t('voting.newSong')}</Badge> : null}
              <p className="text-xs tracking-wider uppercase text-ink-400 m-0">{song.artist}</p>
              <h2 className="font-display italic text-[26px] leading-tight text-ink-900 m-0">
                {song.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-500">{t('voting.swipeHint')}</span>
            <PointsBadge points={givenPoints} />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 rounded-2xl border border-dashed border-line flex items-center justify-center">
          <p className="text-ink-500">{t('voting.deckDone')}</p>
        </div>
      )}
    </div>
  );
}
