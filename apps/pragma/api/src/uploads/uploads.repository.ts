/**
 * Repository for the uploads bounded context. v1 mints stub keys
 * (no S3 yet — the CDK bucket is provisioned but the Lambda still
 * returns synthetic URLs). The repository exists so the controller
 * never imports `node:crypto` directly and the future swap to a real
 * presigner is a single-file change.
 */

import { randomBytes } from 'node:crypto';

export interface MintedUpload {
  s3Key: string;
  uploadUrl: string;
}

export function mintStubUploadKey(prefix: string, ext: string): MintedUpload {
  const random = randomBytes(16).toString('hex');
  const s3Key = `${prefix}/${random}.${ext}`;
  return { s3Key, uploadUrl: `s3://pragma-uploads-stub/${s3Key}` };
}
