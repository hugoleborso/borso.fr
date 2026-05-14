import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const PRESIGN_EXPIRES_SECONDS = 5 * 60;
const ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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

export interface PresignInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly contentType: string;
}

export interface PresignedUpload {
  readonly uploadUrl: string;
  readonly objectKey: string;
  readonly expiresAt: Date;
}

export class MediaConfigError extends Error {
  override readonly name = 'MediaConfigError';
}

export class MediaContentTypeError extends Error {
  override readonly name = 'MediaContentTypeError';
}

/**
 * Build a short-lived S3 PUT URL the admin can post the runner photo to.
 * The key is opaque (UUID), scoped under `editions/<slug>/runners/<slug>/`,
 * with the extension derived from the content type.
 */
export async function createPresignedUpload(
  input: PresignInput,
  now: Date,
): Promise<PresignedUpload> {
  const bucket = readEnv('PHOTOS_BUCKET');
  if (bucket === undefined) throw new MediaConfigError('PHOTOS_BUCKET not set');
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new MediaContentTypeError(`unsupported content type: ${input.contentType}`);
  }
  const extension = input.contentType === 'image/jpeg' ? 'jpg' : input.contentType.split('/')[1] ?? 'bin';
  const objectKey = `editions/${input.editionSlug}/runners/${input.runnerSlug}/${randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: input.contentType,
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
  return {
    uploadUrl,
    objectKey,
    expiresAt: new Date(now.getTime() + PRESIGN_EXPIRES_SECONDS * 1000),
  };
}

