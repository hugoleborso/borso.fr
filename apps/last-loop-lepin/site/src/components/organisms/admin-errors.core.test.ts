import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api-error';
import { RunnerPhotoRejectedError, RunnerPhotoUploadFailedError } from './runner-photo.errors';
import {
  selectAdminLoginError,
  selectEditionDeleteError,
  selectEditionWriteError,
  selectPunchError,
  selectRunnerCreateError,
} from './admin-errors.core';

const ZOD_BODY = {
  error: { issues: [{ path: ['startsAt'], message: 'Invalid datetime' }] },
};

describe('selectEditionWriteError', () => {
  it('names a slug collision', () => {
    expect(selectEditionWriteError(new ApiError(409, null)).key).toBe('admin.setup.slug-taken');
  });

  it('summarises the failing field when the API sent a validation body', () => {
    const message = selectEditionWriteError(new ApiError(400, ZOD_BODY));
    expect(message.key).toBe('admin.setup.invalid-input-detail');
    expect(message.parameters.summary).toBe('startsAt: Invalid datetime');
  });

  it('falls back to the generic message when the body is not a validation body', () => {
    expect(selectEditionWriteError(new ApiError(400, null)).key).toBe('admin.setup.invalid-input');
  });

  it('reports the error message for an API failure it does not name', () => {
    expect(selectEditionWriteError(new ApiError(500, null)).key).toBe('common.error-detail');
  });

  it('reports the error message for any other failure', () => {
    const message = selectEditionWriteError(new Error('network down'));
    expect(message.key).toBe('common.error-detail');
    expect(message.parameters.detail).toBe('network down');
  });

  it('reports an empty detail for a thrown value that is not an error', () => {
    expect(selectEditionWriteError('boom').parameters.detail).toBe('');
  });
});

describe('selectEditionDeleteError', () => {
  it('explains that a started edition cannot be deleted', () => {
    expect(selectEditionDeleteError(new ApiError(409, null)).key).toBe('admin.setup.delete-locked');
  });

  it('reports the error message otherwise', () => {
    expect(selectEditionDeleteError(new Error('nope')).key).toBe('common.error-detail');
  });
});

describe('selectRunnerCreateError', () => {
  it('names a runner slug collision', () => {
    expect(selectRunnerCreateError(new ApiError(409, null)).key).toBe('admin.runners.slug-taken');
  });

  it('reports the error message otherwise', () => {
    expect(selectRunnerCreateError(new ApiError(500, null)).key).toBe('common.error-detail');
  });

  it('names the format a photo was refused for', () => {
    const message = selectRunnerCreateError(
      new RunnerPhotoRejectedError('unsupported-type', 'image/gif'),
    );
    expect(message.key).toBe('admin.runners.photo-type-rejected');
    expect(message.parameters.contentType).toBe('image/gif');
  });

  it('explains a photo refused for its size', () => {
    expect(
      selectRunnerCreateError(new RunnerPhotoRejectedError('too-large', 'image/png')).key,
    ).toBe('admin.runners.photo-too-large');
  });

  it('reports the status of a failed upload', () => {
    const message = selectRunnerCreateError(new RunnerPhotoUploadFailedError(403));
    expect(message.key).toBe('admin.runners.upload-failed');
    expect(message.parameters.status).toBe('403');
  });
});

describe('selectPunchError', () => {
  it('names the runner who already punched this loop', () => {
    const message = selectPunchError(new ApiError(409, null), 'Alice');
    expect(message.key).toBe('admin.punch.already-punched');
    expect(message.parameters.name).toBe('Alice');
  });

  it('reports the error message otherwise', () => {
    expect(selectPunchError(new Error('offline'), 'Alice').key).toBe('common.error-detail');
  });
});

describe('selectAdminLoginError', () => {
  it('explains a rate limited sign in', () => {
    expect(selectAdminLoginError(new ApiError(429, null)).key).toBe('admin.rate-limited');
  });

  it('explains a refused PIN', () => {
    expect(selectAdminLoginError(new ApiError(401, null)).key).toBe('admin.pin-invalid');
  });

  it('falls back to a generic sign in failure', () => {
    expect(selectAdminLoginError(new Error('offline')).key).toBe('admin.sign-in-failed');
  });
});
