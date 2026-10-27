/** @Feature songs */

import { z } from 'zod';
import { ApiError } from '../api.client';

export interface TakenDeezerTrack {
  readonly songId: string;
  readonly songTitle: string;
}

export interface SongSaveRefusal {
  readonly failureMessage: string | null;
  readonly takenTrack: TakenDeezerTrack | null;
}

export interface LastSongWriteFailure {
  readonly isGenericFailureShown: boolean;
  readonly takenTrack: TakenDeezerTrack | null;
}

export const NO_SAVE_REFUSAL: SongSaveRefusal = { failureMessage: null, takenTrack: null };

const NO_WRITE_FAILURE: LastSongWriteFailure = { isGenericFailureShown: false, takenTrack: null };

const UNKNOWN_FAILURE = 'unknown-error';

const deezerTrackTakenBodySchema = z.object({
  error: z.literal('deezer-track-taken'),
  songId: z.string(),
  songTitle: z.string(),
});

// @FollowsBlueprint core-message-selection
export function selectSongSaveRefusal(error: unknown): SongSaveRefusal {
  if (!(error instanceof ApiError)) return { failureMessage: UNKNOWN_FAILURE, takenTrack: null };
  const taken = deezerTrackTakenBodySchema.safeParse(error.body);
  if (!taken.success) return { failureMessage: error.message, takenTrack: null };
  return {
    failureMessage: null,
    takenTrack: { songId: taken.data.songId, songTitle: taken.data.songTitle },
  };
}

export function selectLastSongWriteFailure(
  hasLastWriteFailed: boolean,
  lastWriteError: unknown,
): LastSongWriteFailure {
  if (!hasLastWriteFailed) return NO_WRITE_FAILURE;
  const { takenTrack } = selectSongSaveRefusal(lastWriteError);
  return { isGenericFailureShown: takenTrack === null, takenTrack };
}
