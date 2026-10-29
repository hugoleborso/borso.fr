import type { AllowedUploadContentType } from '@domain/chart-upload.core';
import { TAKE_OBJECT_PREFIX } from '../takes/takes.core';
import { CHART_OBJECT_PREFIX } from './uploads.types';

const EXTENSION_BY_CONTENT_TYPE: Readonly<Record<AllowedUploadContentType, string>> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

// @FollowsBlueprint core-lookup-table
export function extensionForContentType(contentType: AllowedUploadContentType): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType];
}

export interface BuildChartObjectKeyParams {
  readonly contentType: AllowedUploadContentType;
  readonly songId: string;
  readonly randomId: string;
}

export function buildChartObjectKey(params: BuildChartObjectKeyParams): string {
  const extension = extensionForContentType(params.contentType);
  return `${CHART_OBJECT_PREFIX}/${params.songId}/${params.randomId}.${extension}`;
}

// @FollowsBlueprint core-decision
export function canReadFromProductionBucket(
  objectKey: string,
  hasProductionBucket: boolean,
): boolean {
  return hasProductionBucket && objectKey.startsWith(`${TAKE_OBJECT_PREFIX}/`);
}
