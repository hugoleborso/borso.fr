/**
 * Service layer for uploads. Composes the pure key-builder with the
 * S3 presigner repository. Returns DTOs the controller serialises
 * straight to JSON.
 */

import { randomUUID } from 'node:crypto';
import { buildChartObjectKey } from './uploads.core';
import { presignGetObject, presignPutObject } from './uploads.repository';
import type { AllowedUploadContentType, PresignedGetUrl, PresignedPutUrl } from './uploads.types';
import { UPLOAD_URL_EXPIRES_SECONDS } from './uploads.types';

export interface MintChartUploadParams {
  readonly contentType: AllowedUploadContentType;
  readonly songId?: string;
  readonly now: Date;
}

/**
 * @Blueprint service-clock-injected
 * @BlueprintName Service With Injected Clock
 * @BlueprintUsage Use for any service whose result carries a timestamp, so the value it returns is deterministic.
 * @BlueprintDescription Takes `now` as a named field on the params object and derives the expiry from it, so the service reads no clock of its own. The object key comes from the pure `buildChartObjectKey`, which receives the random identifier as an argument rather than generating one, leaving this function the only place either non-deterministic value enters.
 */
export async function mintChartUpload(params: MintChartUploadParams): Promise<PresignedPutUrl> {
  const songId = params.songId ?? randomUUID();
  const objectKey = buildChartObjectKey({
    contentType: params.contentType,
    songId,
    randomId: randomUUID(),
  });
  const uploadUrl = await presignPutObject({
    objectKey,
    contentType: params.contentType,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  });
  return {
    uploadUrl,
    objectKey,
    expiresAt: new Date(params.now.getTime() + UPLOAD_URL_EXPIRES_SECONDS * 1000).toISOString(),
  };
}

export interface MintChartGetUrlParams {
  readonly objectKey: string;
  readonly now: Date;
}

export async function mintChartGetUrl(params: MintChartGetUrlParams): Promise<PresignedGetUrl> {
  const getUrl = await presignGetObject({
    objectKey: params.objectKey,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  });
  return {
    getUrl,
    expiresAt: new Date(params.now.getTime() + UPLOAD_URL_EXPIRES_SECONDS * 1000).toISOString(),
  };
}
