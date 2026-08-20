export interface PresignedPutUrl {
  readonly uploadUrl: string;
  readonly objectKey: string;
  readonly expiresAt: string;
}

export interface PresignedGetUrl {
  readonly getUrl: string;
  readonly expiresAt: string;
}

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
] as const;

export type AllowedUploadContentType = (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;
const MAX_UPLOAD_MEBIBYTES = 10;
const SECONDS_PER_MINUTE = 60;
const UPLOAD_URL_EXPIRES_MINUTES = 5;

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEBIBYTES * BYTES_PER_MEBIBYTE;
export const UPLOAD_URL_EXPIRES_SECONDS = UPLOAD_URL_EXPIRES_MINUTES * SECONDS_PER_MINUTE;
export const CHART_OBJECT_PREFIX = 'chart';
