/** @Feature uploads */

import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  CHART_IMAGE_CONTENT_TYPES,
  CHART_PDF_CONTENT_TYPE,
  type AllowedUploadContentType,
} from '@domain/chart-upload.core';
import { MAX_UPLOAD_MEBIBYTES } from '@domain/input-limits.core';
import type { ParseKeys } from 'i18next';

const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;

export const FILE_DROP_MAX_BYTES = MAX_UPLOAD_MEBIBYTES * BYTES_PER_MEBIBYTE;

export const FILE_DROP_MAX_MEBIBYTES = Math.round(FILE_DROP_MAX_BYTES / BYTES_PER_MEBIBYTE);

export type FileDropChartKind = 'pdf' | 'image';
export type FileRejectionReason = 'unsupported-type' | 'too-large';

export type FileValidationResult =
  | { ok: true; kind: FileDropChartKind; contentType: AllowedUploadContentType }
  | { ok: false; reason: FileRejectionReason };

// @FollowsBlueprint utils-pure-module
export function validateChartFile(file: File): FileValidationResult {
  if (file.size > FILE_DROP_MAX_BYTES) return { ok: false, reason: 'too-large' };
  if (file.type === CHART_PDF_CONTENT_TYPE) {
    return { ok: true, kind: 'pdf', contentType: CHART_PDF_CONTENT_TYPE };
  }
  for (const mime of CHART_IMAGE_CONTENT_TYPES) {
    if (file.type === mime) return { ok: true, kind: 'image', contentType: mime };
  }
  return { ok: false, reason: 'unsupported-type' };
}

export const FILE_DROP_ACCEPT_ATTRIBUTE = ALLOWED_UPLOAD_CONTENT_TYPES.join(',');

const REJECTION_MESSAGE_KEY: Readonly<Record<FileRejectionReason, ParseKeys>> = {
  'too-large': 'catalog.uploadTooLarge',
  'unsupported-type': 'catalog.uploadUnsupported',
};

export function selectRejectionMessageKey(reason: FileRejectionReason): ParseKeys {
  return REJECTION_MESSAGE_KEY[reason];
}
