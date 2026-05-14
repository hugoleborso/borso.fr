import { createPresignedUpload, type PresignedUpload } from './media.s3';

export interface PresignAdminInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly contentType: string;
}

export async function presignRunnerPhotoUpload(
  input: PresignAdminInput,
  now: Date,
): Promise<PresignedUpload> {
  return createPresignedUpload(input, now);
}
