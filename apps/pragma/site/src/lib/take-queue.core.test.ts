import { describe, expect, it } from 'vitest';
import {
  buildQueuedTake,
  buildTakeCreateBody,
  computeTakeRetryDelayMilliseconds,
  decideAfterTakeFailure,
  decideNextTakeMove,
  isQuotaExceededError,
  isTakeDrainable,
  type QueuedTake,
  roundDurationSeconds,
  selectNextTakeStep,
  TAKE_STEP_MAX_ATTEMPTS,
  type TakeDraft,
  withDeferral,
  withFailure,
  withoutSignedUpload,
  withRetryRequested,
  withSignedUpload,
  withUploadedAudio,
} from './take-queue.core';

const NOW = Date.parse('2026-10-23T18:00:00.000Z');
const SAFETY_MARGIN_MILLISECONDS = 30_000;

const UPLOAD = {
  uploadUrl: 'https://bucket.test/take/song/take.webm?signature',
  objectKey: 'take/song-1/take-1.webm',
  expiresAt: new Date(NOW + 5 * 60_000).toISOString(),
};

const QUEUED: QueuedTake = {
  id: 'take-1',
  songId: 'song-1',
  sessionId: 'session-1',
  recordedAt: '2026-10-23T17:00:00.000Z',
  durationSeconds: 137,
  contentType: 'audio/webm',
  byteLength: 2_048,
  source: 'live',
  upload: null,
  isUploaded: false,
  wasDeferred: false,
  hasFailed: false,
};

// @FollowsBlueprint test-pure-unit
describe('selectNextTakeStep', () => {
  it('signs a take that holds no upload address yet', () => {
    expect(selectNextTakeStep(QUEUED, NOW)).toBe('sign');
  });

  it('sends the audio while the signed address is still usable', () => {
    expect(selectNextTakeStep(withSignedUpload(QUEUED, UPLOAD), NOW)).toBe('put');
  });

  it('signs again once the address is inside the safety margin of its expiry', () => {
    const expiresAt = new Date(NOW + SAFETY_MARGIN_MILLISECONDS).toISOString();
    expect(selectNextTakeStep(withSignedUpload(QUEUED, { ...UPLOAD, expiresAt }), NOW)).toBe(
      'sign',
    );
    const justOutside = new Date(NOW + SAFETY_MARGIN_MILLISECONDS + 1).toISOString();
    expect(
      selectNextTakeStep(withSignedUpload(QUEUED, { ...UPLOAD, expiresAt: justOutside }), NOW),
    ).toBe('put');
  });

  it('creates the record once the audio is stored', () => {
    expect(selectNextTakeStep(withUploadedAudio(withSignedUpload(QUEUED, UPLOAD)), NOW)).toBe(
      'create',
    );
  });
});

describe('decideAfterTakeFailure', () => {
  it('signs again when the storage refuses an expired signature', () => {
    expect(decideAfterTakeFailure({ stage: 'put', status: 403 }, 1)).toBe('resign');
  });

  it('gives up on a storage that keeps refusing fresh signatures', () => {
    expect(decideAfterTakeFailure({ stage: 'put', status: 403 }, TAKE_STEP_MAX_ATTEMPTS - 1)).toBe(
      'resign',
    );
    expect(decideAfterTakeFailure({ stage: 'put', status: 403 }, TAKE_STEP_MAX_ATTEMPTS)).toBe(
      'give-up',
    );
  });

  it('holds the take until the member is signed in again', () => {
    expect(decideAfterTakeFailure({ stage: 'sign', status: 401 }, 1)).toBe('hold');
    expect(decideAfterTakeFailure({ stage: 'create', status: 401 }, TAKE_STEP_MAX_ATTEMPTS)).toBe(
      'hold',
    );
  });

  it('gives up on a 403 that is not a storage refusal', () => {
    expect(decideAfterTakeFailure({ stage: 'create', status: 403 }, 1)).toBe('give-up');
  });

  it('retries a network failure, a timeout, a throttle and a server error', () => {
    expect(decideAfterTakeFailure({ stage: 'sign', status: null }, 1)).toBe('retry');
    expect(decideAfterTakeFailure({ stage: 'sign', status: 408 }, 1)).toBe('retry');
    expect(decideAfterTakeFailure({ stage: 'sign', status: 429 }, 1)).toBe('retry');
    expect(decideAfterTakeFailure({ stage: 'create', status: 500 }, 1)).toBe('retry');
  });

  it('gives up on a refusal the same request will meet again', () => {
    expect(decideAfterTakeFailure({ stage: 'create', status: 404 }, 1)).toBe('give-up');
    expect(decideAfterTakeFailure({ stage: 'create', status: 499 }, 1)).toBe('give-up');
    expect(decideAfterTakeFailure({ stage: 'sign', status: 400 }, 1)).toBe('give-up');
  });

  it('holds the take for the next opening once the attempts of this run are spent', () => {
    expect(decideAfterTakeFailure({ stage: 'put', status: null }, TAKE_STEP_MAX_ATTEMPTS - 1)).toBe(
      'retry',
    );
    expect(decideAfterTakeFailure({ stage: 'put', status: null }, TAKE_STEP_MAX_ATTEMPTS)).toBe(
      'hold',
    );
  });
});

describe('computeTakeRetryDelayMilliseconds', () => {
  it('doubles the wait after each attempt, starting at one second', () => {
    expect(computeTakeRetryDelayMilliseconds(1)).toBe(1_000);
    expect(computeTakeRetryDelayMilliseconds(2)).toBe(2_000);
    expect(computeTakeRetryDelayMilliseconds(3)).toBe(4_000);
  });
});

describe('queued take transitions', () => {
  it('drains a take until it has failed for good', () => {
    expect(isTakeDrainable(QUEUED)).toBe(true);
    expect(isTakeDrainable(withFailure(QUEUED))).toBe(false);
  });

  it('forgets the signed address so the next step signs again', () => {
    expect(withoutSignedUpload(withSignedUpload(QUEUED, UPLOAD)).upload).toBeNull();
  });

  it('marks a take that had to wait', () => {
    expect(withDeferral(QUEUED).wasDeferred).toBe(true);
  });

  it('starts a requested retry over from a fresh signature', () => {
    const retried = withRetryRequested(withFailure(withSignedUpload(QUEUED, UPLOAD)));
    expect(retried.hasFailed).toBe(false);
    expect(retried.upload).toBeNull();
  });
});

describe('buildTakeCreateBody', () => {
  it('sends the stored key and says whether the take waited in the queue', () => {
    expect(buildTakeCreateBody(withDeferral(QUEUED), UPLOAD.objectKey)).toEqual({
      id: 'take-1',
      objectKey: UPLOAD.objectKey,
      songId: 'song-1',
      sessionId: 'session-1',
      recordedAt: '2026-10-23T17:00:00.000Z',
      durationSeconds: 137,
      contentType: 'audio/webm',
      source: 'live',
      queued: true,
    });
  });
});

describe('roundDurationSeconds', () => {
  it('rounds to the nearest second', () => {
    expect(roundDurationSeconds(137_499)).toBe(137);
    expect(roundDurationSeconds(137_500)).toBe(138);
  });

  it('answers zero for a length the browser could not measure', () => {
    expect(roundDurationSeconds(Number.NaN)).toBe(0);
    expect(roundDurationSeconds(Number.POSITIVE_INFINITY)).toBe(0);
    expect(roundDurationSeconds(-1)).toBe(0);
    expect(roundDurationSeconds(-1_500)).toBe(0);
    expect(roundDurationSeconds(0)).toBe(0);
  });
});

describe('buildQueuedTake', () => {
  const DRAFT: TakeDraft = {
    id: 'take-1',
    songId: 'song-1',
    sessionId: null,
    recordedAt: new Date('2026-10-23T17:00:00.000Z'),
    durationSeconds: 42,
    rawContentType: 'audio/webm;codecs=opus',
    byteLength: 512,
    source: 'upload',
    isOnline: true,
  };

  it('stores the normalized content type and starts with nothing sent', () => {
    expect(buildQueuedTake(DRAFT)).toEqual({
      id: 'take-1',
      songId: 'song-1',
      sessionId: null,
      recordedAt: '2026-10-23T17:00:00.000Z',
      durationSeconds: 42,
      contentType: 'audio/webm',
      byteLength: 512,
      source: 'upload',
      upload: null,
      isUploaded: false,
      wasDeferred: false,
      hasFailed: false,
    });
  });

  it('counts a take made offline as deferred', () => {
    expect(buildQueuedTake({ ...DRAFT, isOnline: false })?.wasDeferred).toBe(true);
  });

  it('refuses a recording whose type is not one the band can play', () => {
    expect(buildQueuedTake({ ...DRAFT, rawContentType: 'video/mp4' })).toBeNull();
  });
});

describe('decideNextTakeMove', () => {
  const SIGNED = withSignedUpload(QUEUED, UPLOAD);

  it('finishes with what the create answered', () => {
    expect(decideNextTakeMove({ kind: 'created', created: 'take-1' }, SIGNED, 2)).toEqual({
      kind: 'done',
      created: 'take-1',
    });
  });

  it('stores an advanced take and starts the next step with fresh attempts', () => {
    expect(decideNextTakeMove({ kind: 'advanced', take: SIGNED }, QUEUED, 2)).toEqual({
      kind: 'next',
      take: SIGNED,
      attempt: 0,
      isPersisted: true,
      retriedAfter: null,
      waitMilliseconds: 0,
    });
  });

  it('signs again at once after a storage refusal, counting the attempt', () => {
    const failure = { stage: 'put' as const, status: 403 };
    expect(decideNextTakeMove({ kind: 'failed', failure }, SIGNED, 0)).toEqual({
      kind: 'next',
      take: QUEUED,
      attempt: 1,
      isPersisted: false,
      retriedAfter: null,
      waitMilliseconds: 0,
    });
  });

  it('waits before retrying a passing failure, and marks the take as deferred', () => {
    const failure = { stage: 'sign' as const, status: null };
    expect(decideNextTakeMove({ kind: 'failed', failure }, QUEUED, 1)).toEqual({
      kind: 'next',
      take: withDeferral(QUEUED),
      attempt: 2,
      isPersisted: false,
      retriedAfter: failure,
      waitMilliseconds: 2_000,
    });
  });

  it('holds the take once the attempts are spent', () => {
    const failure = { stage: 'create' as const, status: 503 };
    expect(
      decideNextTakeMove({ kind: 'failed', failure }, SIGNED, TAKE_STEP_MAX_ATTEMPTS - 1),
    ).toEqual({ kind: 'stop', take: withDeferral(SIGNED), failure });
  });

  it('marks the take as failed on a refusal', () => {
    const failure = { stage: 'create' as const, status: 404 };
    expect(decideNextTakeMove({ kind: 'failed', failure }, SIGNED, 0)).toEqual({
      kind: 'stop',
      take: withFailure(withDeferral(SIGNED)),
      failure,
    });
  });
});

describe('isQuotaExceededError', () => {
  it('recognises a full device and nothing else', () => {
    expect(isQuotaExceededError(new DOMException('full', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaExceededError(new DOMException('other', 'InvalidStateError'))).toBe(false);
    expect(isQuotaExceededError(new Error('QuotaExceededError'))).toBe(false);
  });
});
