import { describe, expect, it } from 'vitest';
import { ApiError } from '../api.client';
import {
  NO_SAVE_REFUSAL,
  selectLastSongWriteFailure,
  selectSongSaveRefusal,
} from './song-save-refusal.core';

const HOLDER_ID = '0b6f1f5e-3c56-4b8e-9d63-0f5b4b1f2a10';
const TAKEN_TRACK_REFUSAL = new ApiError(409, 'update 409', {
  error: 'deezer-track-taken',
  songId: HOLDER_ID,
  songTitle: 'Get Lucky',
});

// @FollowsBlueprint test-pure-unit
describe('selectSongSaveRefusal', () => {
  it('reads a taken Deezer track as a refusal naming the song that holds it', () => {
    expect(selectSongSaveRefusal(TAKEN_TRACK_REFUSAL)).toEqual({
      failureMessage: null,
      takenTrack: { songId: HOLDER_ID, songTitle: 'Get Lucky' },
    });
  });

  it('reads any other API answer as a failed save carrying its message', () => {
    expect(selectSongSaveRefusal(new ApiError(400, 'create 400', null))).toEqual({
      failureMessage: 'create 400',
      takenTrack: null,
    });
    expect(
      selectSongSaveRefusal(new ApiError(409, 'create 409', { error: 'something-else' })),
    ).toEqual({ failureMessage: 'create 409', takenTrack: null });
  });

  it('reads a failure that is not an API answer as an unknown failure', () => {
    expect(selectSongSaveRefusal(new TypeError('offline'))).toEqual({
      failureMessage: 'unknown-error',
      takenTrack: null,
    });
  });

  it('starts a form with nothing refused', () => {
    expect(NO_SAVE_REFUSAL).toEqual({ failureMessage: null, takenTrack: null });
  });
});

describe('selectLastSongWriteFailure', () => {
  it('shows nothing when the last write went through', () => {
    expect(selectLastSongWriteFailure(false, TAKEN_TRACK_REFUSAL)).toEqual({
      isGenericFailureShown: false,
      takenTrack: null,
    });
  });

  it('names the holder instead of the generic line when the write lost the Deezer track', () => {
    expect(selectLastSongWriteFailure(true, TAKEN_TRACK_REFUSAL)).toEqual({
      isGenericFailureShown: false,
      takenTrack: { songId: HOLDER_ID, songTitle: 'Get Lucky' },
    });
  });

  it('shows the generic line for any other failed write', () => {
    expect(selectLastSongWriteFailure(true, new ApiError(500, 'update 500', null))).toEqual({
      isGenericFailureShown: true,
      takenTrack: null,
    });
  });
});
