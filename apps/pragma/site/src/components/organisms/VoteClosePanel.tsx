/** @Feature setlist-voting */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongTally } from '../../lib/queries/voting.utils';
import { moveWithin, reorderByDrop } from '../../routes/setlists/vote-proposal.core';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { BottomActions } from '../atoms/BottomActions';
import type { TallySong } from './VoteTally';
import { VoteProposalRow } from './VoteProposalRow';

export interface VoteClosePanelProps {
  readonly proposal: readonly SongTally[];
  readonly songsById: ReadonlyMap<string, TallySong>;
  readonly addableSongs: readonly TallySong[];
  readonly targetSongCount: number;
  readonly isClosing: boolean;
  readonly onClose: (songIds: readonly string[]) => void;
  readonly onCancel: () => void;
}

const DRAG_ACTIVATION_DISTANCE_PX = 6;
const DRAG_TOUCH_DELAY_MS = 200;
const DRAG_TOUCH_TOLERANCE_PX = 8;

// @FollowsBlueprint organism-mutation-panel
export function VoteClosePanel({
  proposal,
  songsById,
  addableSongs,
  targetSongCount,
  isClosing,
  onClose,
  onCancel,
}: VoteClosePanelProps): JSX.Element {
  const { t } = useTranslation();
  const [keptSongIds, setKeptSongIds] = useState<string[]>(() =>
    proposal.map((tally) => tally.songId),
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: DRAG_TOUCH_DELAY_MS, tolerance: DRAG_TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isOverTarget = keptSongIds.length > targetSongCount;
  const leftOutSongs = addableSongs.filter((song) => !keptSongIds.includes(song.id));

  return (
    <section className="flex flex-col gap-3 px-4 py-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-body text-ink m-0">{t('voting.closeTitle')}</h2>
        <span className="text-meta tabular-nums text-ink-soft">
          {keptSongIds.length} / {targetSongCount}
        </span>
      </header>
      {isOverTarget ? (
        <p className="text-meta text-ink-soft m-0" role="status">
          {t('voting.closeOverTarget')}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event: DragEndEvent) => {
          setKeptSongIds(
            reorderByDrop(keptSongIds, String(event.active.id), event.over?.id ?? null),
          );
        }}
      >
        <SortableContext items={keptSongIds} strategy={verticalListSortingStrategy}>
          <ol className="list-none p-0 m-0 flex flex-col gap-2">
            {keptSongIds.map((songId, position) => (
              <VoteProposalRow
                key={songId}
                songId={songId}
                title={songsById.get(songId)?.title ?? songId}
                points={proposal.find((tally) => tally.songId === songId)?.points ?? 0}
                position={position}
                isFirst={position === 0}
                isLast={position === keptSongIds.length - 1}
                onMoveUp={() => setKeptSongIds(moveWithin(keptSongIds, position, position - 1))}
                onMoveDown={() => setKeptSongIds(moveWithin(keptSongIds, position, position + 1))}
                onRemove={() =>
                  setKeptSongIds(keptSongIds.filter((candidate) => candidate !== songId))
                }
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {leftOutSongs.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <span className="text-label tracking-wider uppercase text-ink-soft">
            {t('voting.closeAddLabel')}
          </span>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {leftOutSongs.map((song) => (
              <li
                key={song.id}
                className="flex items-center gap-2 rounded-lg border border-dashed border-rule px-3 py-2"
              >
                <span className="flex-1 min-w-0 truncate text-ink-soft">{song.title}</span>
                <IconButton
                  icon="plus"
                  label={t('voting.addToProposal')}
                  onClick={() => setKeptSongIds([...keptSongIds, song.id])}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <BottomActions>
        <Button icon="close" type="button" variant="quiet" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          icon="check"
          type="button"
          variant="primary"
          className="flex-1"
          disabled={keptSongIds.length === 0 || isClosing}
          onClick={() => onClose(keptSongIds)}
        >
          {t('voting.closeSubmit')}
        </Button>
      </BottomActions>
    </section>
  );
}
