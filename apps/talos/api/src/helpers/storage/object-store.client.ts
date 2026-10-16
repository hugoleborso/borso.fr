/**
 * @DependsOnExternal aws-s3
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const DEFAULT_REGION = 'eu-west-3';
const JSON_CONTENT_TYPE = 'application/json';

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient !== null) return cachedClient;
  cachedClient = new S3Client({ region: process.env.AWS_REGION ?? DEFAULT_REGION });
  return cachedClient;
}

export async function putJsonObject(bucket: string, key: string, body: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: JSON_CONTENT_TYPE }),
  );
}
