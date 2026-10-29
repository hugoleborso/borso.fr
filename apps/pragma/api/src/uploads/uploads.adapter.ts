/**
 * @DependsOnExternal aws-s3
 */

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { UploadsBucketSource } from './uploads.types';

let cachedClient: S3Client | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function getClient(): S3Client {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, since a presigned signature depends on the region and the credentials rather than on which client object produced it
  if (cachedClient !== null) return cachedClient;
  const region = readEnv('AWS_REGION') ?? 'eu-west-3';
  cachedClient = new S3Client({ region });
  return cachedClient;
}

export class UploadsConfigError extends Error {
  override readonly name = 'UploadsConfigError';
}

export interface PresignPutParams {
  readonly objectKey: string;
  readonly contentType: string;
  readonly expiresInSeconds: number;
  readonly contentLength?: number;
}

/**
 * @Blueprint adapter-external-service
 * @BlueprintName Adapter Over An External Service
 * @BlueprintUsage Use for the one file in a bounded context that leaves the process, whether that is a vendor SDK or a plain fetch.
 * @BlueprintDescription Holds the client in a module-level cache, reads its configuration at call time so a missing variable raises the slice's own error instead of failing at import, and returns a plain value rather than the vendor's own type, which keeps the SDK import out of the service and the controller. Per ADR-0012 this suffix is the only place an outbound call may be written.
 */
export async function presignPutObject(params: PresignPutParams): Promise<string> {
  const bucket = readEnv('UPLOADS_BUCKET');
  if (bucket === undefined) throw new UploadsConfigError('UPLOADS_BUCKET not set');
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.objectKey,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  return await getSignedUrl(getClient(), command, { expiresIn: params.expiresInSeconds });
}

export interface PresignGetParams {
  readonly objectKey: string;
  readonly expiresInSeconds: number;
  readonly source?: UploadsBucketSource;
}

const BUCKET_VARIABLE_BY_SOURCE = {
  own: 'UPLOADS_BUCKET',
  production: 'PRODUCTION_UPLOADS_BUCKET',
} as const satisfies Readonly<Record<UploadsBucketSource, string>>;

function readBucketOf(source: UploadsBucketSource): string {
  const variable = BUCKET_VARIABLE_BY_SOURCE[source];
  const bucket = readEnv(variable);
  if (bucket === undefined) throw new UploadsConfigError(`${variable} not set`);
  return bucket;
}

export async function presignGetObject(params: PresignGetParams): Promise<string> {
  const bucket = readBucketOf(params.source ?? 'own');
  const command = new GetObjectCommand({ Bucket: bucket, Key: params.objectKey });
  return await getSignedUrl(getClient(), command, { expiresIn: params.expiresInSeconds });
}

export function hasProductionUploadsBucket(): boolean {
  return readEnv(BUCKET_VARIABLE_BY_SOURCE.production) !== undefined;
}

export async function isStoredInOwnBucket(objectKey: string): Promise<boolean> {
  const bucket = readBucketOf('own');
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return true;
  } catch (error) {
    if (error instanceof NotFound) return false;
    throw error;
  }
}

const DELETE_OBJECTS_BATCH_SIZE = 1_000;

function splitIntoBatches(objectKeys: readonly string[]): string[][] {
  const batches: string[][] = [];
  for (let start = 0; start < objectKeys.length; start += DELETE_OBJECTS_BATCH_SIZE) {
    batches.push(objectKeys.slice(start, start + DELETE_OBJECTS_BATCH_SIZE));
  }
  return batches;
}

async function deleteOneBatch(bucket: string, objectKeys: readonly string[]): Promise<string[]> {
  const answer = await getClient().send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: objectKeys.map((objectKey) => ({ Key: objectKey })), Quiet: true },
    }),
  );
  return (
    answer.Errors?.flatMap((failure) => (failure.Key === undefined ? [] : [failure.Key])) ?? []
  );
}

export async function deleteObjects(objectKeys: readonly string[]): Promise<string[]> {
  const bucket = readEnv('UPLOADS_BUCKET');
  if (bucket === undefined) throw new UploadsConfigError('UPLOADS_BUCKET not set');
  const failedKeys: string[] = [];
  for (const batch of splitIntoBatches(objectKeys)) {
    failedKeys.push(...(await deleteOneBatch(bucket, batch)));
  }
  return failedKeys;
}
