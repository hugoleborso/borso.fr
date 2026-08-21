/** @Feature songs */

import type { MutationStatus } from '@tanstack/react-query';
import { z } from 'zod';

interface SongWrite {
  readonly variables: unknown;
  readonly status: MutationStatus;
}

const songWriteVariablesSchema = z.object({ id: z.string() });

function readSongId(variables: unknown): string | null {
  const namedSong = songWriteVariablesSchema.safeParse(variables);
  return namedSong.success ? namedSong.data.id : null;
}

// @FollowsBlueprint core-view-projection
export function didLastSongWriteFail(songWrites: readonly SongWrite[], songId: string): boolean {
  let hasFailed = false;
  for (const songWrite of songWrites) {
    if (readSongId(songWrite.variables) !== songId) continue;
    hasFailed = songWrite.status === 'error';
  }
  return hasFailed;
}

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
