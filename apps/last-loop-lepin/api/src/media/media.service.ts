import { createPresignedUpload, type PresignedUpload } from './media.adapter';

export { answerInvalidInput } from '../helpers/validation/invalid-input.middleware';

// @FollowsBlueprint service-facade-reexport
export { MediaConfigError, MediaContentTypeError } from './media.adapter';

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
