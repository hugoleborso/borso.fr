import { MAX_UPLOAD_MEBIBYTES } from '@domain/input-limits.core';
export interface PresignedPutUrl {
  readonly uploadUrl: string;
  readonly objectKey: string;
  readonly expiresAt: string;
}

export interface PresignedGetUrl {
  readonly getUrl: string;
  readonly expiresAt: string;
}

const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;
const SECONDS_PER_MINUTE = 60;
const UPLOAD_URL_EXPIRES_MINUTES = 5;

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEBIBYTES * BYTES_PER_MEBIBYTE;
export const UPLOAD_URL_EXPIRES_SECONDS = UPLOAD_URL_EXPIRES_MINUTES * SECONDS_PER_MINUTE;
export const CHART_OBJECT_PREFIX = 'chart';
