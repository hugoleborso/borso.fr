/**
 * Uploads a runner's photo and returns the object key the runner record will
 * carry.
 *
 * The presign call goes through the Hono client and a mutation, like every
 * other call to our API. The `PUT` that follows goes straight to Amazon with
 * `fetch`, which is the one direct request this site makes, because the
 * presigned URL points at S3 and the client knows nothing about it.
 */

import { usePresignRunnerPhoto } from '../../lib/queries/runners';
import { listPresent } from '../../lib/optional.utils';
import { readPhotoContentType, selectPhotoRejection } from './runner-form.core';
import { RunnerPhotoRejectedError, RunnerPhotoUploadFailedError } from './runner-photo.errors';

export interface RunnerPhotoUpload {
  readonly isPending: boolean;
  readonly uploadPhoto: (runnerSlug: string, photo: File | null) => Promise<string | null>;
}

export function useRunnerPhotoUpload(editionSlug: string): RunnerPhotoUpload {
  const presign = usePresignRunnerPhoto();

  async function uploadPhoto(runnerSlug: string, photo: File | null): Promise<string | null> {
    let objectKey: string | null = null;
    for (const picked of listPresent(photo)) {
      const rejection = selectPhotoRejection({
        contentType: picked.type,
        sizeBytes: picked.size,
      });
      if (rejection !== null) throw new RunnerPhotoRejectedError(rejection, picked.type);
      const contentType = readPhotoContentType(picked.type);
      if (contentType === null) throw new RunnerPhotoRejectedError('unsupported-type', picked.type);
      const target = await presign.mutateAsync({ editionSlug, runnerSlug, contentType });
      const uploaded = await fetch(target.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': contentType },
        body: picked,
      });
      if (!uploaded.ok) throw new RunnerPhotoUploadFailedError(uploaded.status);
      objectKey = target.objectKey;
    }
    return objectKey;
  }

  return { isPending: presign.isPending, uploadPhoto };
}
