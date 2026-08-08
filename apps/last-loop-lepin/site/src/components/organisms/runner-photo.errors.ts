/**
 * Failures the runner photo upload can produce. They live apart from the
 * hook that throws them so the message mapping in `admin-errors.core.ts` can
 * recognise them without importing React.
 */

import type { PhotoRejection } from './runner-form.core';

export class RunnerPhotoRejectedError extends Error {
  override readonly name = 'RunnerPhotoRejectedError';
  constructor(
    readonly rejection: Exclude<PhotoRejection, null>,
    readonly contentType: string,
  ) {
    super(`photo rejected: ${rejection}`);
  }
}

export class RunnerPhotoUploadFailedError extends Error {
  override readonly name = 'RunnerPhotoUploadFailedError';
  constructor(readonly status: number) {
    super(`photo upload failed with ${status}`);
  }
}
