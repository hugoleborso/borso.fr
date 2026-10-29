import { randomUUID } from 'node:crypto';
import { buildChartObjectKey, canReadFromProductionBucket } from './uploads.core';
import {
  deleteObjects,
  hasProductionUploadsBucket,
  isStoredInOwnBucket,
  presignGetObject,
  presignPutObject,
} from './uploads.adapter';
import type { AllowedUploadContentType } from '@domain/chart-upload.core';
import type { PresignedGetUrl, PresignedPutUrl, UploadsBucketSource } from './uploads.types';
import { UPLOAD_URL_EXPIRES_SECONDS } from './uploads.types';

const MILLISECONDS_PER_SECOND = 1_000;

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
  return await mintObjectUpload({ objectKey, contentType: params.contentType, now: params.now });
}

export interface MintObjectUploadParams {
  readonly objectKey: string;
  readonly contentType: string;
  readonly contentLength?: number;
  readonly now: Date;
}

export async function mintObjectUpload(params: MintObjectUploadParams): Promise<PresignedPutUrl> {
  const uploadUrl = await presignPutObject({
    objectKey: params.objectKey,
    contentType: params.contentType,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    ...(params.contentLength === undefined ? {} : { contentLength: params.contentLength }),
  });
  return {
    uploadUrl,
    objectKey: params.objectKey,
    expiresAt: new Date(
      params.now.getTime() + UPLOAD_URL_EXPIRES_SECONDS * MILLISECONDS_PER_SECOND,
    ).toISOString(),
  };
}

export interface StoredObjectDeletion {
  readonly failedObjectKeys: readonly string[];
  readonly failureName: string | null;
}

function readFailureName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export async function deleteStoredObjects(
  objectKeys: readonly string[],
): Promise<StoredObjectDeletion> {
  try {
    return { failedObjectKeys: await deleteObjects(objectKeys), failureName: null };
  } catch (error) {
    return { failedObjectKeys: objectKeys, failureName: readFailureName(error) };
  }
}

export interface MintChartGetUrlParams {
  readonly objectKey: string;
  readonly now: Date;
}

async function resolveReadSource(objectKey: string): Promise<UploadsBucketSource> {
  const canReadFromProduction = canReadFromProductionBucket(
    objectKey,
    hasProductionUploadsBucket(),
  );
  if (!canReadFromProduction) return 'own';
  const isInOwnBucket = await isStoredInOwnBucket(objectKey);
  return isInOwnBucket ? 'own' : 'production';
}

export async function mintChartGetUrl(params: MintChartGetUrlParams): Promise<PresignedGetUrl> {
  const getUrl = await presignGetObject({
    objectKey: params.objectKey,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    source: await resolveReadSource(params.objectKey),
  });
  return {
    getUrl,
    expiresAt: new Date(
      params.now.getTime() + UPLOAD_URL_EXPIRES_SECONDS * MILLISECONDS_PER_SECOND,
    ).toISOString(),
  };
}
