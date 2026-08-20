import type { PhotoRejection } from './runner-form.core';

// @FollowsBlueprint named-domain-error
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
