/**
 * Repository for the uploads bounded context. The only file that
 * imports `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
 * Exposes two operations:
 *  - `presignPutObject` — short-lived PUT URL pinned to a content type.
 *  - `presignGetObject` — short-lived GET URL the FE renders the
 *    uploaded chart from (no public bucket policy, no CloudFront).
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedClient: S3Client | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function getClient(): S3Client {
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
