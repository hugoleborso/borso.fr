/**
 * The runner registration form's rules: the slug derived from the display
 * name, the accepted photo formats, and the shape the form fields hold.
 *
 * The Zod schema mirrors `createRunnerInputSchema` in
 * `api/src/runner/runner.schema.ts`. It is restated rather than imported
 * because that file also declares the Drizzle table, which has no business in
 * a browser bundle.
 */

import { z } from 'zod';

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const LEADING_OR_TRAILING_DASHES = /^-+|-+$/g;

const MINIMUM_NAME_LENGTH = 2;
const MAXIMUM_NAME_LENGTH = 120;
const MINIMUM_BIB = 1;
const MAXIMUM_BIB = 9999;
const MAXIMUM_PHOTO_BYTES = 5 * 1024 * 1024;

export const RUNNER_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type RunnerPhotoContentType = (typeof RUNNER_PHOTO_CONTENT_TYPES)[number];

export interface RunnerFormValues {
  readonly displayName: string;
  readonly bib: string;
}

export const RUNNER_FORM_DEFAULTS: RunnerFormValues = { displayName: '', bib: '' };

// @FollowsBlueprint core-form-schema
export const runnerFormValuesSchema = z.object({
  displayName: z.string().trim().min(MINIMUM_NAME_LENGTH).max(MAXIMUM_NAME_LENGTH),
  bib: z
    .string()
    .refine((raw) => Number.isInteger(Number.parseInt(raw, 10)), { message: 'bib-required' })
    .refine(
      (raw) => {
        const parsed = Number.parseInt(raw, 10);
        return parsed >= MINIMUM_BIB && parsed <= MAXIMUM_BIB;
      },
      { message: 'bib-out-of-range' },
    ),
});

/** URL friendly identifier derived from the display name the organiser typed. */
export function slugifyRunnerName(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(NON_SLUG_CHARACTERS, '-')
    .replace(LEADING_OR_TRAILING_DASHES, '');
}

export function readBibNumber(raw: string): number {
  return Number.parseInt(raw, 10);
}

export type PhotoRejection = 'unsupported-type' | 'too-large' | null;

export interface PhotoDescriptor {
  readonly contentType: string;
  readonly sizeBytes: number;
}

/**
 * Why a picked photo cannot be uploaded, or null when it can. The size cap
 * matches what the presigned upload accepts, so a file too large is refused
 * before it costs the operator a round trip.
 */
export function selectPhotoRejection(photo: PhotoDescriptor): PhotoRejection {
  const isSupported = RUNNER_PHOTO_CONTENT_TYPES.some((type) => type === photo.contentType);
  if (!isSupported) return 'unsupported-type';
  if (photo.sizeBytes > MAXIMUM_PHOTO_BYTES) return 'too-large';
  return null;
}

/**
 * Narrow a browser supplied MIME type to the union the API accepts, or null
 * when it is not one of them. The `File` type says `string`, and a hostile
 * file must not reach the network on that promise alone.
 */
export function readPhotoContentType(rawContentType: string): RunnerPhotoContentType | null {
  return RUNNER_PHOTO_CONTENT_TYPES.find((type) => type === rawContentType) ?? null;
}
