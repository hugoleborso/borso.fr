/**
 * Pure rules for the media bounded context: which content types a runner
 * photo may be uploaded as, and the file extension each one stores under.
 */

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const ALLOWED_PHOTO_CONTENT_TYPES: ReadonlySet<string> = new Set(PHOTO_CONTENT_TYPES);

// @FollowsBlueprint core-lookup-table
export function fileExtensionForContentType(contentType: string): string {
  const fileExtensionByContentType: Readonly<Record<string, string>> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const fallbackFileExtension = 'bin';
  return fileExtensionByContentType[contentType] ?? fallbackFileExtension;
}
