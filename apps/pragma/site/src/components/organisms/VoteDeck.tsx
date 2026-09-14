/** @Feature setlist-voting */

import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DeckGeometry,
  type DeckZone,
  IDLE_OFFSET,
  judgeRelease,
  readIntentPoints,
  type ReleaseIntent,
  readGivenPoints,
  selectCardRotation,
  selectDiscardTint,
  selectNextCardIndex,
  selectScoringTint,
  selectZoneForOffset,
  SCORING_ZONES,
} from '../../routes/setlists/vote-deck.core';
import { PointsBadge } from '../atoms/PointsBadge';

export interface DeckSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

export interface VoteDeckProps {
  readonly songs: readonly DeckSong[];
  readonly remainingPoints: number;
  readonly pointsBySongId: Readonly<Record<string, number>>;
  readonly onScore: (songId: string, points: number) => void;
  readonly onExhausted: () => void;
}

const UNKNOWN_GEOMETRY: DeckGeometry = { width: 1, height: 1 };

// @FollowsBlueprint organism-mutation-panel
export function VoteDeck({
  songs,
  remainingPoints,
  pointsBySongId,
  onScore,
  onExhausted,
}: VoteDeckProps): JSX.Element {
  const { t } = useTranslation();
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>(IDLE_OFFSET);
  const [geometry, setGeometry] = useState<DeckGeometry>(UNKNOWN_GEOMETRY);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const song = songs[cardIndex];
  const hasDeckLeft = song !== undefined;
  const zone: DeckZone = isDragging ? selectZoneForOffset(offset, geometry) : 'none';
  const givenPoints = readGivenPoints(pointsBySongId, song?.id ?? '');

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGeometry({ width: box.width, height: box.height });
    setIsDragging(true);
    setOffset(IDLE_OFFSET);
  }

  function trackDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setOffset({ x: offset.x + event.movementX, y: offset.y + event.movementY });
  }

  const applyRelease: Readonly<Record<ReleaseIntent['kind'], (points: number) => void>> = {
    refused: () => {
      onExhausted();
    },
    return: () => undefined,
    score: (points) => {
      if (song === undefined) return;
      onScore(song.id, points);
      setCardIndex(selectNextCardIndex(cardIndex, songs.length));
    },
  };

  function endDrag() {
    const intent = judgeRelease(selectZoneForOffset(offset, geometry), remainingPoints);
    setIsDragging(false);
    setOffset(IDLE_OFFSET);
    applyRelease[intent.kind](readIntentPoints(intent));
  }

  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-[3/4] select-none">
      <div className="absolute inset-y-0 right-0 w-1/2 flex flex-col pointer-events-none">
        {SCORING_ZONES.map((scoring) => (
          <div
            key={scoring.zone}
            data-zone={scoring.zone}
            className="flex-1 flex items-center justify-end pr-4 rounded-r-2xl bg-accent transition-opacity"
            style={{ opacity: selectScoringTint(zone, scoring.zone, offset, geometry) }}
          >
            <PointsBadge points={scoring.points} />
          </div>
        ))}
      </div>
      <div
        data-zone="discard"
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none rounded-l-2xl bg-ink-400 transition-opacity"
        style={{ opacity: selectDiscardTint(zone, offset, geometry) }}
      />
      {hasDeckLeft ? (
        <div
          role="group"
          aria-label={t('voting.cardLabel')}
          className="absolute inset-0 touch-none rounded-2xl border border-line bg-surface p-6 flex flex-col justify-between shadow-lg cursor-grab"
          style={{
            transform: `translate(${String(offset.x)}px, ${String(offset.y)}px) rotate(${String(selectCardRotation(offset))}deg)`,
          }}
          onPointerDown={startDrag}
          onPointerMove={trackDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div>
            <p className="text-xs tracking-wider uppercase text-ink-400 m-0">{song.artist}</p>
            <h2 className="font-display italic text-[32px] leading-tight text-ink-900 m-0">
              {song.title}
            </h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-500">{t('voting.swipeHint')}</span>
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
