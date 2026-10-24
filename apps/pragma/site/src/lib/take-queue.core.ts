/** @Feature takes */

import {
  normalizeTakeContentType,
  type TakeContentType,
  type TakeSource,
} from '@domain/take-upload.core';

export interface SignedTakeUpload {
  readonly uploadUrl: string;
  readonly objectKey: string;
  readonly expiresAt: string;
}

export interface QueuedTake {
  readonly id: string;
  readonly songId: string;
  readonly sessionId: string | null;
  readonly recordedAt: string;
  readonly durationSeconds: number;
  readonly contentType: TakeContentType;
  readonly byteLength: number;
  readonly source: TakeSource;
  readonly upload: SignedTakeUpload | null;
  readonly isUploaded: boolean;
  readonly wasDeferred: boolean;
  readonly hasFailed: boolean;
}

export type TakeStep = 'sign' | 'put' | 'create';

export type TakeStage = TakeStep;

export interface TakeStepFailure {
  readonly stage: TakeStage;
  readonly status: number | null;
}

export type TakeFailureDecision = 'retry' | 'resign' | 'hold' | 'give-up';

export const TAKE_STEP_MAX_ATTEMPTS = 3;

const UPLOAD_URL_SAFETY_MARGIN_MILLISECONDS = 30_000;
const RETRY_BASE_DELAY_MILLISECONDS = 1_000;
const RETRY_GROWTH_FACTOR = 2;
const REQUEST_TIMEOUT_STATUS = 408;
const TOO_MANY_REQUESTS_STATUS = 429;
const FIRST_SERVER_ERROR_STATUS = 500;
const FORBIDDEN_STATUS = 403;
const UNAUTHORIZED_STATUS = 401;

// @FollowsBlueprint core-decision
export function selectNextTakeStep(take: QueuedTake, nowEpochMilliseconds: number): TakeStep {
  if (take.isUploaded) return 'create';
  if (take.upload === null) return 'sign';
  const expiresAtEpochMilliseconds = Date.parse(take.upload.expiresAt);
  const isStillUsable =
    expiresAtEpochMilliseconds - UPLOAD_URL_SAFETY_MARGIN_MILLISECONDS > nowEpochMilliseconds;
  return isStillUsable ? 'put' : 'sign';
}

function isTransientStatus(status: number | null): boolean {
  if (status === null) return true;
  if (status === REQUEST_TIMEOUT_STATUS || status === TOO_MANY_REQUESTS_STATUS) return true;
  return status >= FIRST_SERVER_ERROR_STATUS;
}

// @FollowsBlueprint core-decision
export function decideAfterTakeFailure(
  failure: TakeStepFailure,
  attempt: number,
): TakeFailureDecision {
  const hasAttemptsLeft = attempt < TAKE_STEP_MAX_ATTEMPTS;
  if (failure.status === UNAUTHORIZED_STATUS) return 'hold';
  if (failure.stage === 'put' && failure.status === FORBIDDEN_STATUS) {
    return hasAttemptsLeft ? 'resign' : 'give-up';
  }
  if (!isTransientStatus(failure.status)) return 'give-up';
  return hasAttemptsLeft ? 'retry' : 'hold';
}

export function computeTakeRetryDelayMilliseconds(attempt: number): number {
  return RETRY_BASE_DELAY_MILLISECONDS * RETRY_GROWTH_FACTOR ** (attempt - 1);
}

export function isTakeDrainable(take: QueuedTake): boolean {
  return !take.hasFailed;
}

export function withSignedUpload(take: QueuedTake, upload: SignedTakeUpload): QueuedTake {
  return { ...take, upload };
}

export function withoutSignedUpload(take: QueuedTake): QueuedTake {
  return { ...take, upload: null };
}

export function withUploadedAudio(take: QueuedTake): QueuedTake {
  return { ...take, isUploaded: true };
}

export function withDeferral(take: QueuedTake): QueuedTake {
  return { ...take, wasDeferred: true };
}

export function withFailure(take: QueuedTake): QueuedTake {
  return { ...take, hasFailed: true };
}

export function withRetryRequested(take: QueuedTake): QueuedTake {
  return { ...take, hasFailed: false, upload: null };
}

export interface TakeCreateBody {
  readonly id: string;
  readonly objectKey: string;
  readonly songId: string;
  readonly sessionId: string | null;
  readonly recordedAt: string;
  readonly durationSeconds: number;
  readonly contentType: TakeContentType;
  readonly source: TakeSource;
  readonly queued: boolean;
}

export function buildTakeCreateBody(take: QueuedTake, objectKey: string): TakeCreateBody {
  return {
    id: take.id,
    objectKey,
    songId: take.songId,
    sessionId: take.sessionId,
    recordedAt: take.recordedAt,
    durationSeconds: take.durationSeconds,
    contentType: take.contentType,
    source: take.source,
    queued: take.wasDeferred,
  };
}

export interface TakeDraft {
  readonly id: string;
  readonly songId: string;
  readonly sessionId: string | null;
  readonly recordedAt: Date;
  readonly durationSeconds: number;
  readonly rawContentType: string;
  readonly byteLength: number;
  readonly source: TakeSource;
  readonly isOnline: boolean;
}

const MILLISECONDS_PER_SECOND = 1_000;

export function roundDurationSeconds(durationMilliseconds: number): number {
  if (!Number.isFinite(durationMilliseconds)) return 0;
  return Math.max(0, Math.round(durationMilliseconds / MILLISECONDS_PER_SECOND));
}

// @FollowsBlueprint core-decision
export function buildQueuedTake(draft: TakeDraft): QueuedTake | null {
  const contentType = normalizeTakeContentType(draft.rawContentType);
  if (contentType === null) return null;
  return {
    id: draft.id,
    songId: draft.songId,
    sessionId: draft.sessionId,
    recordedAt: draft.recordedAt.toISOString(),
    durationSeconds: draft.durationSeconds,
    contentType,
    byteLength: draft.byteLength,
    source: draft.source,
    upload: null,
    isUploaded: false,
    wasDeferred: !draft.isOnline,
    hasFailed: false,
  };
}

export type TakeStepOutcome<TCreated> =
  | { readonly kind: 'advanced'; readonly take: QueuedTake }
  | { readonly kind: 'created'; readonly created: TCreated }
  | { readonly kind: 'failed'; readonly failure: TakeStepFailure };

export type TakeNextMove<TCreated> =
  | { readonly kind: 'done'; readonly created: TCreated }
  | {
      readonly kind: 'next';
      readonly take: QueuedTake;
      readonly attempt: number;
      readonly isPersisted: boolean;
      readonly retriedAfter: TakeStepFailure | null;
      readonly waitMilliseconds: number;
    }
  | { readonly kind: 'stop'; readonly take: QueuedTake; readonly failure: TakeStepFailure };

const FRESH_STEP = { attempt: 0, isPersisted: true, retriedAfter: null, waitMilliseconds: 0 };

// @FollowsBlueprint core-decision
export function decideNextTakeMove<TCreated>(
  outcome: TakeStepOutcome<TCreated>,
  take: QueuedTake,
  attempt: number,
): TakeNextMove<TCreated> {
  if (outcome.kind === 'created') return { kind: 'done', created: outcome.created };
  if (outcome.kind === 'advanced') return { kind: 'next', take: outcome.take, ...FRESH_STEP };
  const { failure } = outcome;
  const failedAttempt = attempt + 1;
  const decision = decideAfterTakeFailure(failure, failedAttempt);
  const sameStepAgain = { ...FRESH_STEP, attempt: failedAttempt, isPersisted: false };
  if (decision === 'resign') {
    return { kind: 'next', take: withoutSignedUpload(take), ...sameStepAgain };
  }
  const deferred = withDeferral(take);
  if (decision === 'retry') {
    return {
      kind: 'next',
      take: deferred,
      ...sameStepAgain,
      retriedAfter: failure,
      waitMilliseconds: computeTakeRetryDelayMilliseconds(failedAttempt),
    };
  }
  const stopped = decision === 'give-up' ? withFailure(deferred) : deferred;
  return { kind: 'stop', take: stopped, failure };
}

const QUOTA_EXCEEDED_ERROR = 'QuotaExceededError';

export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === QUOTA_EXCEEDED_ERROR;
}
