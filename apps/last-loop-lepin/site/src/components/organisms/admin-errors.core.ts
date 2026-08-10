/**
 * Every message the admin screens show when a write fails.
 *
 * Each function maps a rejected request to the translation key that explains
 * it, so the panels hold no status code arithmetic and the mapping has its own
 * tests. An unnamed failure falls back to the message the error carried.
 */

import { ApiError } from '../../lib/api-error';
import type { PhotoRejection } from './runner-form.core';
import { RunnerPhotoRejectedError, RunnerPhotoUploadFailedError } from './runner-photo.errors';
import { summariseZodError } from './setup-form.utils';

const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;
const UNAUTHORISED_STATUS = 401;
const TOO_MANY_REQUESTS_STATUS = 429;

export type AdminErrorKey =
  | 'admin.setup.slug-taken'
  | 'admin.setup.invalid-input'
  | 'admin.setup.invalid-input-detail'
  | 'admin.setup.delete-locked'
  | 'admin.runners.slug-taken'
  | 'admin.runners.photo-type-rejected'
  | 'admin.runners.photo-too-large'
  | 'admin.runners.upload-failed'
  | 'admin.punch.already-punched'
  | 'admin.pin-invalid'
  | 'admin.rate-limited'
  | 'admin.sign-in-failed'
  | 'common.error-detail';

export interface AdminErrorMessage {
  readonly key: AdminErrorKey;
  readonly parameters: {
    readonly summary: string;
    readonly detail: string;
    readonly name: string;
    readonly contentType: string;
    readonly status: string;
  };
}

function buildMessage(
  key: AdminErrorKey,
  overrides: Partial<AdminErrorMessage['parameters']> = {},
) {
  return {
    key,
    parameters: { summary: '', detail: '', name: '', contentType: '', status: '', ...overrides },
  };
}

function readErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '';
}

function fallbackMessage(error: unknown): AdminErrorMessage {
  return buildMessage('common.error-detail', { detail: readErrorDetail(error) });
}

function readStatus(error: unknown): number | null {
  if (error instanceof ApiError) return error.status;
  return null;
}

/** Why the API refused a create or replace on an edition. */
export function selectEditionWriteError(error: unknown): AdminErrorMessage {
  if (!(error instanceof ApiError)) return fallbackMessage(error);
  if (error.status === CONFLICT_STATUS) return buildMessage('admin.setup.slug-taken');
  if (error.status !== BAD_REQUEST_STATUS) return fallbackMessage(error);
  const summary = summariseZodError(error.body);
  if (summary === null) return buildMessage('admin.setup.invalid-input');
  return buildMessage('admin.setup.invalid-input-detail', { summary });
}

/** Why the API refused to delete an edition. */
export function selectEditionDeleteError(error: unknown): AdminErrorMessage {
  if (readStatus(error) === CONFLICT_STATUS) return buildMessage('admin.setup.delete-locked');
  return fallbackMessage(error);
}

const PHOTO_KEY_BY_REJECTION: Readonly<
  Record<
    Exclude<PhotoRejection, null>,
    'admin.runners.photo-type-rejected' | 'admin.runners.photo-too-large'
  >
> = {
  'unsupported-type': 'admin.runners.photo-type-rejected',
  'too-large': 'admin.runners.photo-too-large',
};

/** Why registering a runner failed, including before the request was sent. */
export function selectRunnerCreateError(error: unknown): AdminErrorMessage {
  if (error instanceof RunnerPhotoRejectedError) {
    return buildMessage(PHOTO_KEY_BY_REJECTION[error.rejection], {
      contentType: error.contentType,
    });
  }
  if (error instanceof RunnerPhotoUploadFailedError) {
    return buildMessage('admin.runners.upload-failed', { status: `${error.status}` });
  }
  if (readStatus(error) === CONFLICT_STATUS) return buildMessage('admin.runners.slug-taken');
  return fallbackMessage(error);
}

/** Why the API refused a punch, which is usually a duplicate for the loop. */
export function selectPunchError(error: unknown, runnerName: string): AdminErrorMessage {
  if (readStatus(error) === CONFLICT_STATUS) {
    return buildMessage('admin.punch.already-punched', { name: runnerName });
  }
  return fallbackMessage(error);
}

/** Why the API refused the administrator PIN. */
export function selectAdminLoginError(error: unknown): AdminErrorMessage {
  const status = readStatus(error);
  if (status === TOO_MANY_REQUESTS_STATUS) return buildMessage('admin.rate-limited');
  if (status === UNAUTHORISED_STATUS) return buildMessage('admin.pin-invalid');
  return buildMessage('admin.sign-in-failed');
}
