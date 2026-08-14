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

interface SongWriteEntry {
  readonly variables: unknown;
  readonly status: MutationStatus;
}

const songWriteVariablesSchema = z.object({ id: z.string() });

function isWriteForSong(variables: unknown, songId: string): boolean {
  const parsed = songWriteVariablesSchema.safeParse(variables);
  return parsed.success && parsed.data.id === songId;
}

/**
 * Later entries win: the mutation cache keeps them in the order they were
 * fired, so the last one naming this song is the write the operator just made.
 */
// @FollowsBlueprint core-view-projection
export function didLastSongWriteFail(entries: readonly SongWriteEntry[], songId: string): boolean {
  let hasFailed = false;
  for (const entry of entries) {
    if (!isWriteForSong(entry.variables, songId)) continue;
    hasFailed = entry.status === 'error';
  }
  return hasFailed;
}
