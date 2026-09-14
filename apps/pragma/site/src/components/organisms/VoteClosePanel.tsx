/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongTally } from '../../lib/queries/voting.utils';
import { Button } from '../atoms/Button';
import { PointsBadge } from '../atoms/PointsBadge';
import type { TallySong } from './VoteTally';

export interface VoteClosePanelProps {
  readonly proposal: readonly SongTally[];
  readonly songsById: ReadonlyMap<string, TallySong>;
  readonly targetSongCount: number;
  readonly isClosing: boolean;
  readonly onClose: (songIds: readonly string[]) => void;
}

function moveWithin(songIds: readonly string[], from: number, target: number): string[] {
  const reordered = [...songIds];
  const [moved] = reordered.splice(from, 1);
  if (moved === undefined) return reordered;
  reordered.splice(target, 0, moved);
  return reordered;
}

// @FollowsBlueprint organism-mutation-panel
export function VoteClosePanel({
  proposal,
  songsById,
  targetSongCount,
  isClosing,
  onClose,
}: VoteClosePanelProps): JSX.Element {
  const { t } = useTranslation();
  const [keptSongIds, setKeptSongIds] = useState<string[]>(() =>
    proposal.map((tally) => tally.songId),
  );

  const isOverTarget = keptSongIds.length > targetSongCount;

  return (
    <section className="flex flex-col gap-3 px-4 py-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base text-ink-900 m-0">{t('voting.closeTitle')}</h2>
        <span className="text-sm tabular-nums text-ink-500">
          {keptSongIds.length} / {targetSongCount}
        </span>
      </header>
      {isOverTarget ? (
        <p className="text-sm text-ink-500 m-0" role="status">
          {t('voting.closeOverTarget')}
        </p>
      ) : null}
      <ol className="list-none p-0 m-0 flex flex-col gap-2">
        {keptSongIds.map((songId, position) => (
          <li
            key={songId}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
          >
            <span className="w-6 text-right tabular-nums text-ink-400">{position + 1}</span>
            <span className="flex-1 min-w-0 truncate text-ink-900">
              {songsById.get(songId)?.title ?? songId}
            </span>
            <PointsBadge points={proposal.find((tally) => tally.songId === songId)?.points ?? 0} />
            <Button
              type="button"
              variant="ghost"
              aria-label={t('voting.moveUp')}
              disabled={position === 0}
              onClick={() => setKeptSongIds(moveWithin(keptSongIds, position, position - 1))}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={t('voting.moveDown')}
              disabled={position === keptSongIds.length - 1}
              onClick={() => setKeptSongIds(moveWithin(keptSongIds, position, position + 1))}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={t('voting.removeFromProposal')}
              onClick={() =>
                setKeptSongIds(keptSongIds.filter((candidate) => candidate !== songId))
              }
            >
              ×
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="accent"
        disabled={keptSongIds.length === 0 || isClosing}
        onClick={() => onClose(keptSongIds)}
      >
        {t('voting.closeSubmit')}
      </Button>
    </section>
  );
}
