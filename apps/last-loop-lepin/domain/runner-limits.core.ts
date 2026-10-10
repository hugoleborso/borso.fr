export const MAXIMUM_RUNNER_NAME_LENGTH = 120;

export const MINIMUM_BIB = 1;
export const MAXIMUM_BIB = 9_999;

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];
