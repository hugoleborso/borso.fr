/**
 * Whether the last write aimed at a song failed.
 *
 * A song save is optimistic: the caches take the new values and the operator
 * lands back on the read-only page without waiting for the round trip. When the
 * write then fails, `onError` puts the old values back — so the page would
 * quietly show the old artist again, as if the edit had never been typed. The
 * detail page asks here whether the song it shows lost its last write, and says
 * so.
 *
 * TanStack Query types a mutation's variables as `unknown`, and a create carries
 * no id at all, so which song a write names is parsed rather than asserted.
 */

import type { MutationStatus } from '@tanstack/react-query';
import { z } from 'zod';

interface SongWrite {
  readonly variables: unknown;
  readonly status: MutationStatus;
}

const songWriteVariablesSchema = z.object({ id: z.string() });

/** The song a write names, or null when the write names none — a create. */
function readSongId(variables: unknown): string | null {
  const namedSong = songWriteVariablesSchema.safeParse(variables);
  return namedSong.success ? namedSong.data.id : null;
}

/**
 * Later entries win: the mutation cache keeps them in the order they were
 * fired, so the last one naming this song is the write the operator just made.
 */
// @FollowsBlueprint core-view-projection
export function didLastSongWriteFail(songWrites: readonly SongWrite[], songId: string): boolean {
  let hasFailed = false;
  for (const songWrite of songWrites) {
    if (readSongId(songWrite.variables) !== songId) continue;
    hasFailed = songWrite.status === 'error';
  }
  return hasFailed;
}

/**
 * Which song lost its last write, for a page that shows many of them rather
 * than one — the catalog, after a delete the operator has already walked away
 * from. Answers the most recently fired failure, since that is the one they
 * just caused.
 */
// @FollowsBlueprint core-view-projection
export function selectSongThatLostItsLastWrite(songWrites: readonly SongWrite[]): string | null {
  const lastStatusBySong = new Map<string, MutationStatus>();
  for (const songWrite of songWrites) {
    const songId = readSongId(songWrite.variables);
    if (songId === null) continue;
    lastStatusBySong.set(songId, songWrite.status);
  }
  let songThatFailed: string | null = null;
  for (const [songId, status] of lastStatusBySong) {
    if (status === 'error') songThatFailed = songId;
  }
  return songThatFailed;
}
