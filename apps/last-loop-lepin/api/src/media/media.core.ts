import { PHOTO_CONTENT_TYPES } from '@domain/runner-limits.core';

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
