import type { DatabaseExecutor } from '../database/client';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { didClaimInspirationWithin } from '../inspirations/inspirations.service';
import type {
  SketchClipCreateInput,
  SketchClipMoveInput,
  SketchLaneCreateInput,
  SketchLaneRenameInput,
} from './sketches.schema';
import {
  deleteLanesAndClipsOfSongWithin,
  didClaimLaneOfSongWithin,
  didClaimSketchSongWithin,
  didDeleteClip,
  didDeleteLaneWithClips,
  findClipWithin,
  findLaneOfSongWithin,
  findMovedClipWithin,
  findRenamedLane,
  hasInsertedClipWithin,
  hasSong,
  insertLaneUnlessPresentWithin,
  listClipsOfSong,
  listLanesOfSong,
  runInOneSketchTransaction,
} from './sketches.repository';
import type {
  SketchClipOutcome,
  SketchClipRow,
  SketchDeletionOutcome,
  SketchLaneOutcome,
  SketchReadOutcome,
  SketchRefusal,
  SketchRefused,
} from './sketches.types';

function refuse(reason: SketchRefusal): SketchRefused {
  return { kind: 'refused', reason };
}

export async function getSketch(songId: string): Promise<SketchReadOutcome> {
  if (!(await hasSong(songId))) return refuse('song-not-found');
  const [lanes, clips] = await Promise.all([listLanesOfSong(songId), listClipsOfSong(songId)]);
  return { kind: 'ok', sketch: { songId, lanes, clips } };
}

export async function createLane(
  songId: string,
  input: SketchLaneCreateInput,
): Promise<SketchLaneOutcome> {
  return await runInOneSketchTransaction(async (executor): Promise<SketchLaneOutcome> => {
    if (!(await didClaimSketchSongWithin(executor, songId))) return refuse('song-not-found');
    await insertLaneUnlessPresentWithin(executor, { ...input, songId });
    const lane = await findLaneOfSongWithin(executor, songId, input.id);
    if (lane === null) return refuse('lane-not-found');
    return { kind: 'ok', lane };
  });
}

export async function renameLane(
  songId: string,
  laneId: string,
  input: SketchLaneRenameInput,
): Promise<SketchLaneOutcome> {
  const lane = await findRenamedLane(songId, laneId, input.name);
  if (lane === null) return refuse('lane-not-found');
  return { kind: 'ok', lane };
}

export async function removeLane(songId: string, laneId: string): Promise<SketchDeletionOutcome> {
  if (!(await didDeleteLaneWithClips(songId, laneId))) return refuse('lane-not-found');
  return { kind: 'ok' };
}

async function getWrittenClipWithin(
  executor: DatabaseExecutor,
  clipId: string,
): Promise<SketchClipRow> {
  const clip = await findClipWithin(executor, clipId);
  if (clip === null) throw new Error('the written clip is not visible to its own transaction');
  return clip;
}

type ClipPlacement =
  | { readonly kind: 'placed'; readonly clip: SketchClipRow; readonly isNewClip: boolean }
  | SketchRefused;

// @FollowsBlueprint service-orchestration
export async function placeClip(
  songId: string,
  input: SketchClipCreateInput,
): Promise<SketchClipOutcome> {
  const placement = await runInOneSketchTransaction(async (executor): Promise<ClipPlacement> => {
    if (!(await didClaimLaneOfSongWithin(executor, songId, input.laneId))) {
      return refuse('lane-not-found');
    }
    if (!(await didClaimInspirationWithin(executor, input.inspirationId))) {
      return refuse('inspiration-not-found');
    }
    const isNewClip = await hasInsertedClipWithin(executor, input);
    return { kind: 'placed', clip: await getWrittenClipWithin(executor, input.id), isNewClip };
  });
  if (placement.kind === 'refused') return placement;
  if (placement.isNewClip) recordProductEvent({ event: 'sketch_clip_placed', song_id: songId });
  return { kind: 'ok', clip: placement.clip };
}

export async function moveClip(
  songId: string,
  clipId: string,
  input: SketchClipMoveInput,
): Promise<SketchClipOutcome> {
  const outcome = await runInOneSketchTransaction(async (executor): Promise<SketchClipOutcome> => {
    if (!(await didClaimLaneOfSongWithin(executor, songId, input.laneId))) {
      return refuse('lane-not-found');
    }
    const moved = await findMovedClipWithin(executor, songId, { id: clipId, ...input });
    if (moved === null) return refuse('clip-not-found');
    return { kind: 'ok', clip: moved };
  });
  if (outcome.kind !== 'ok') return outcome;
  recordProductEvent({ event: 'sketch_clip_moved', song_id: songId });
  return outcome;
}

export async function removeClip(songId: string, clipId: string): Promise<SketchDeletionOutcome> {
  if (!(await didDeleteClip(songId, clipId))) return refuse('clip-not-found');
  return { kind: 'ok' };
}

export async function deleteSketchOfDeletedSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await deleteLanesAndClipsOfSongWithin(executor, songId);
}
