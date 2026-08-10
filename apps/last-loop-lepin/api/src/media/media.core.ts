/**
 * Pure rules for the media bounded context: which content types a runner
 * photo may be uploaded as, and the file extension each one stores under.
 */

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

const FILE_EXTENSION_BY_CONTENT_TYPE: Readonly<Record<PhotoContentType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FALLBACK_FILE_EXTENSION = 'bin';

export const ALLOWED_PHOTO_CONTENT_TYPES: ReadonlySet<string> = new Set(PHOTO_CONTENT_TYPES);

// @FollowsBlueprint core-lookup-table
export function fileExtensionForContentType(contentType: string): string {
  const extensions: Readonly<Record<string, string>> = FILE_EXTENSION_BY_CONTENT_TYPE;
  return extensions[contentType] ?? FALLBACK_FILE_EXTENSION;
}
