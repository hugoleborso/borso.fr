import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { deleteSketchOfDeletedComposition } from '../sketches/sketches.service';
import { createCatalogueSongWithin } from '../songs/songs.service';
import {
  didDeleteCompositionWithin,
  findClaimedCompositionWithin,
  findCompositionWithin,
  findRenamedComposition,
  hasInsertedCompositionWithin,
  linkCompositionToSongWithin,
  listCompositionsNewestFirst,
  runInOneCompositionTransaction,
} from './compositions.repository';
import type { CompositionCreateInput, CompositionRenameInput } from './compositions.schema';
import type { CompositionDeletion, CompositionOutcome, CompositionRow } from './compositions.types';

const NOT_FOUND = { kind: 'composition-not-found' } as const;

type Cataloguing =
  | { readonly kind: 'ok'; readonly composition: CompositionRow; readonly isNewSong: boolean }
  | typeof NOT_FOUND;

export async function listCompositions(): Promise<CompositionRow[]> {
  return await listCompositionsNewestFirst();
}

// @FollowsBlueprint service-orchestration
export async function createComposition(
  input: CompositionCreateInput,
  now: Date,
): Promise<CompositionRow> {
  const recording = await runInOneCompositionTransaction(async (executor) => {
    const isNewComposition = await hasInsertedCompositionWithin(executor, {
      ...input,
      songId: null,
      createdAt: now,
    });
    return { isNewComposition, composition: await findCompositionWithin(executor, input.id) };
  });
  if (recording.composition === null) {
    throw new Error('the written composition is not visible to its own transaction');
  }
  if (recording.isNewComposition) {
    recordProductEvent({ event: 'composition_created', composition_id: input.id });
  }
  return recording.composition;
}

export async function renameComposition(
  id: string,
  input: CompositionRenameInput,
): Promise<CompositionOutcome> {
  const composition = await findRenamedComposition(id, input.title);
  if (composition === null) return NOT_FOUND;
  return { kind: 'ok', composition };
}

export async function removeComposition(id: string): Promise<CompositionDeletion> {
  return await runInOneCompositionTransaction(async (executor): Promise<CompositionDeletion> => {
    if (!(await didDeleteCompositionWithin(executor, id))) return NOT_FOUND;
    await deleteSketchOfDeletedComposition(executor, id);
    return { kind: 'deleted' };
  });
}

export async function catalogueComposition(id: string): Promise<CompositionOutcome> {
  const cataloguing = await runInOneCompositionTransaction(
    async (executor): Promise<Cataloguing> => {
      const claimed = await findClaimedCompositionWithin(executor, id);
      if (claimed === null) return NOT_FOUND;
      if (claimed.songId !== null) return { kind: 'ok', composition: claimed, isNewSong: false };
      const song = await createCatalogueSongWithin(executor, claimed.title);
      await linkCompositionToSongWithin(executor, id, song.id);
      return { kind: 'ok', composition: { ...claimed, songId: song.id }, isNewSong: true };
    },
  );
  if (cataloguing.kind !== 'ok') return cataloguing;
  if (cataloguing.isNewSong) {
    recordProductEvent({ event: 'composition_cataloged', composition_id: id });
  }
  return { kind: 'ok', composition: cataloguing.composition };
}
