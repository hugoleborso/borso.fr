import { z } from 'zod';

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const LEADING_OR_TRAILING_DASHES = /^-+|-+$/g;

const MINIMUM_NAME_LENGTH = 2;
const MAXIMUM_NAME_LENGTH = 120;
const MINIMUM_BIB = 1;
const MAXIMUM_BIB = 9999;
const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;
const MAXIMUM_PHOTO_MEBIBYTES = 5;
const MAXIMUM_PHOTO_BYTES = MAXIMUM_PHOTO_MEBIBYTES * BYTES_PER_MEBIBYTE;

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
        const asNumber = Number.parseInt(raw, 10);
        return asNumber >= MINIMUM_BIB && asNumber <= MAXIMUM_BIB;
      },
      { message: 'bib-out-of-range' },
    ),
});

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

export function selectPhotoRejection(photo: PhotoDescriptor): PhotoRejection {
  const isSupported = RUNNER_PHOTO_CONTENT_TYPES.some((type) => type === photo.contentType);
  if (!isSupported) return 'unsupported-type';
  if (photo.sizeBytes > MAXIMUM_PHOTO_BYTES) return 'too-large';
  return null;
}

export function readPhotoContentType(rawContentType: string): RunnerPhotoContentType | null {
  return RUNNER_PHOTO_CONTENT_TYPES.find((type) => type === rawContentType) ?? null;
}
