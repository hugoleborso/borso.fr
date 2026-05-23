/**
 * Shared DTOs for the uploads bounded context. The controller, service
 * and repository all import from here so the swap to a real presigner
 * doesn't ripple through type names.
 */

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

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_URL_EXPIRES_SECONDS = 5 * 60;
export const CHART_OBJECT_PREFIX = 'chart';
