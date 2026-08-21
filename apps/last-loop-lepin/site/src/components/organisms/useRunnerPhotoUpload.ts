import { usePresignRunnerPhoto } from '../../lib/queries/runners';
import { listPresent } from '../../lib/optional.utils';
import { readPhotoContentType, selectPhotoRejection } from './runner-form.core';
import { RunnerPhotoRejectedError, RunnerPhotoUploadFailedError } from './runner-photo.errors';
import { sendFileToPresignedUrl } from '../../lib/object-upload.adapter';

export interface RunnerPhotoUpload {
  readonly isPending: boolean;
  readonly uploadPhoto: (runnerSlug: string, photo: File | null) => Promise<string | null>;
}

// @FollowsBlueprint hook-stateful-helper
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
      const failureStatus = await sendFileToPresignedUrl(target.uploadUrl, picked, contentType);
      if (failureStatus !== null) throw new RunnerPhotoUploadFailedError(failureStatus);
      objectKey = target.objectKey;
    }
    return objectKey;
  }

  return { isPending: presign.isPending, uploadPhoto };
}
