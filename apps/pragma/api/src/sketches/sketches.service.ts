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
  deleteLanesAndClipsOfCompositionWithin,
  didClaimLaneOfCompositionWithin,
  didClaimSketchCompositionWithin,
  didDeleteClip,
  didDeleteLaneWithClips,
  findClipOfCompositionWithin,
  findLaneOfCompositionWithin,
  findMovedClipWithin,
  findRenamedLane,
  hasInsertedClipWithin,
  findSketchComposition,
  insertLaneUnlessPresentWithin,
  listClipsOfComposition,
  listLanesOfComposition,
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

export async function readSketch(compositionId: string): Promise<SketchReadOutcome> {
  const [composition, lanes, clips] = await Promise.all([
    findSketchComposition(compositionId),
    listLanesOfComposition(compositionId),
    listClipsOfComposition(compositionId),
  ]);
  if (composition === null) return refuse('composition-not-found');
  return { kind: 'ok', sketch: { composition, lanes, clips } };
}

export async function createLane(
  compositionId: string,
  input: SketchLaneCreateInput,
): Promise<SketchLaneOutcome> {
  return await runInOneSketchTransaction(async (executor): Promise<SketchLaneOutcome> => {
    if (!(await didClaimSketchCompositionWithin(executor, compositionId)))
      return refuse('composition-not-found');
    await insertLaneUnlessPresentWithin(executor, { ...input, compositionId });
    const lane = await findLaneOfCompositionWithin(executor, compositionId, input.id);
    if (lane === null) return refuse('lane-not-found');
    return { kind: 'ok', lane };
  });
}

export async function renameLane(
  compositionId: string,
  laneId: string,
  input: SketchLaneRenameInput,
): Promise<SketchLaneOutcome> {
  const lane = await findRenamedLane(compositionId, laneId, input.name);
  if (lane === null) return refuse('lane-not-found');
  return { kind: 'ok', lane };
}

export async function removeLane(
  compositionId: string,
  laneId: string,
): Promise<SketchDeletionOutcome> {
  if (!(await didDeleteLaneWithClips(compositionId, laneId))) return refuse('lane-not-found');
  return { kind: 'ok' };
}

type ClipPlacement =
  | { readonly kind: 'placed'; readonly clip: SketchClipRow; readonly isNewClip: boolean }
  | SketchRefused;

// @FollowsBlueprint service-orchestration
export async function placeClip(
  compositionId: string,
  input: SketchClipCreateInput,
): Promise<SketchClipOutcome> {
  const placement = await runInOneSketchTransaction(async (executor): Promise<ClipPlacement> => {
    if (!(await didClaimLaneOfCompositionWithin(executor, compositionId, input.laneId))) {
      return refuse('lane-not-found');
    }
    if (!(await didClaimInspirationWithin(executor, input.inspirationId))) {
      return refuse('inspiration-not-found');
    }
    const isNewClip = await hasInsertedClipWithin(executor, input);
    const clip = await findClipOfCompositionWithin(executor, compositionId, input.id);
    if (clip === null) return refuse('clip-not-found');
    return { kind: 'placed', clip, isNewClip };
  });
  if (placement.kind === 'refused') return placement;
  if (placement.isNewClip)
    recordProductEvent({ event: 'sketch_clip_placed', composition_id: compositionId });
  return { kind: 'ok', clip: placement.clip };
}

export async function moveClip(
  compositionId: string,
  clipId: string,
  input: SketchClipMoveInput,
): Promise<SketchClipOutcome> {
  const outcome = await runInOneSketchTransaction(async (executor): Promise<SketchClipOutcome> => {
    if (!(await didClaimLaneOfCompositionWithin(executor, compositionId, input.laneId))) {
      return refuse('lane-not-found');
    }
    const moved = await findMovedClipWithin(executor, compositionId, { id: clipId, ...input });
    if (moved === null) return refuse('clip-not-found');
    return { kind: 'ok', clip: moved };
  });
  if (outcome.kind !== 'ok') return outcome;
  recordProductEvent({ event: 'sketch_clip_moved', composition_id: compositionId });
  return outcome;
}

export async function removeClip(
  compositionId: string,
  clipId: string,
): Promise<SketchDeletionOutcome> {
  if (!(await didDeleteClip(compositionId, clipId))) return refuse('clip-not-found');
  return { kind: 'ok' };
}

export async function deleteSketchOfDeletedComposition(
  executor: DatabaseExecutor,
  compositionId: string,
): Promise<void> {
  await deleteLanesAndClipsOfCompositionWithin(executor, compositionId);
}
