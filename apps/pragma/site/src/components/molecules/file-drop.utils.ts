/**
 * Pure validation helpers for the chord-chart upload. Centralises the
 * accepted MIME list, the 10 MiB ceiling, the MIME→chart-kind projection that
 * the song form consumes, and the message each rejection reason shows.
 * @Feature uploads
 */

import type { ParseKeys } from 'i18next';

const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;
const FILE_DROP_MAX_MEBIBYTES_ALLOWED = 10;

export const FILE_DROP_MAX_BYTES = FILE_DROP_MAX_MEBIBYTES_ALLOWED * BYTES_PER_MEBIBYTE;

export const FILE_DROP_MAX_MEBIBYTES = Math.round(FILE_DROP_MAX_BYTES / BYTES_PER_MEBIBYTE);

export const ALLOWED_PDF_MIME = 'application/pdf';
export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic'] as const;

export type FileDropChartKind = 'pdf' | 'image';
export type AllowedUploadContentType =
  typeof ALLOWED_PDF_MIME | (typeof ALLOWED_IMAGE_MIMES)[number];

export type FileRejectionReason = 'unsupported-type' | 'too-large';

export type FileValidationResult =
  | { ok: true; kind: FileDropChartKind; contentType: AllowedUploadContentType }
  | { ok: false; reason: FileRejectionReason };

// @FollowsBlueprint utils-pure-module
export function validateChartFile(file: File): FileValidationResult {
  if (file.size > FILE_DROP_MAX_BYTES) return { ok: false, reason: 'too-large' };
  if (file.type === ALLOWED_PDF_MIME) {
    return { ok: true, kind: 'pdf', contentType: ALLOWED_PDF_MIME };
  }
  for (const mime of ALLOWED_IMAGE_MIMES) {
    if (file.type === mime) return { ok: true, kind: 'image', contentType: mime };
  }
  return { ok: false, reason: 'unsupported-type' };
}

export const FILE_DROP_ACCEPT_ATTRIBUTE = [ALLOWED_PDF_MIME, ...ALLOWED_IMAGE_MIMES].join(',');

const REJECTION_MESSAGE_KEY: Readonly<Record<FileRejectionReason, ParseKeys>> = {
  'too-large': 'catalog.uploadTooLarge',
  'unsupported-type': 'catalog.uploadUnsupported',
};

export function selectRejectionMessageKey(reason: FileRejectionReason): ParseKeys {
  return REJECTION_MESSAGE_KEY[reason];
}
