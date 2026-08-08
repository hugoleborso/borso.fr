/**
 * Pure rules for the media bounded context: which content types a runner
 * photo may be uploaded as, and the file extension each one stores under.
 */

const FILE_EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const FALLBACK_FILE_EXTENSION = 'bin';

export const ALLOWED_PHOTO_CONTENT_TYPES: ReadonlySet<string> = new Set(
  Object.keys(FILE_EXTENSION_BY_CONTENT_TYPE),
);

export function fileExtensionForContentType(contentType: string): string {
  const extensions: Readonly<Record<string, string>> = FILE_EXTENSION_BY_CONTENT_TYPE;
  return extensions[contentType] ?? FALLBACK_FILE_EXTENSION;
}
