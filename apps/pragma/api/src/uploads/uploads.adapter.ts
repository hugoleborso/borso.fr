/**
 * The uploads context's way out of the process. Per ADR-0012 an outbound call
 * lives in an `.adapter.ts` and nowhere else, so the S3 SDK is imported here
 * and by nothing else in this application. Two operations:
 *  - `presignPutObject` — short-lived PUT URL pinned to a content type.
 *  - `presignGetObject` — short-lived GET URL the FE renders the
 *    uploaded chart from (no public bucket policy, no CloudFront).
 *
 * @DependsOnExternal aws-s3
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedClient: S3Client | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function getClient(): S3Client {
  // Stryker disable next-line ConditionalExpression: equivalent mutant. Dropping
  // the guard builds a second client per call, which no caller can observe —
  // the signature a presigner produces depends on the region and the
  // credentials, not on which client object produced it.
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
  });
  return await getSignedUrl(getClient(), command, { expiresIn: params.expiresInSeconds });
}

export interface PresignGetParams {
  readonly objectKey: string;
  readonly expiresInSeconds: number;
}

export async function presignGetObject(params: PresignGetParams): Promise<string> {
  const bucket = readEnv('UPLOADS_BUCKET');
  if (bucket === undefined) throw new UploadsConfigError('UPLOADS_BUCKET not set');
  const command = new GetObjectCommand({ Bucket: bucket, Key: params.objectKey });
  return await getSignedUrl(getClient(), command, { expiresIn: params.expiresInSeconds });
}
