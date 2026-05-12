/**
 * @vitest-environment node
 *
 * media.service is a thin wrapper around `createPresignedUpload`; this
 * test exercises the wrapper boundary so the file isn't left untested.
 * Heavy S3 / content-type assertions live in media.s3.test.ts.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MediaContentTypeError } from './media.s3';
import { presignRunnerPhotoUpload } from './media.service';

const PRESERVED_ENV: Record<string, string | undefined> = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  PHOTOS_BUCKET: process.env.PHOTOS_BUCKET,
};

describe('media.service', () => {
  beforeAll(() => {
    process.env.AWS_REGION = 'eu-west-3';
    process.env.AWS_ACCESS_KEY_ID = 'AKIA-TEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'TEST-SECRET-KEY-LONG-ENOUGH-FOR-SIGV4';
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(PRESERVED_ENV)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('forwards a valid jpeg upload request', async () => {
    const result = await presignRunnerPhotoUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      new Date(),
    );
    expect(result.uploadUrl).toMatch(/^https:\/\//);
    expect(result.objectKey).toMatch(/\.jpg$/);
  });

  it('propagates MediaContentTypeError for unsupported content types', async () => {
    await expect(
      presignRunnerPhotoUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/heif' },
        new Date(),
      ),
    ).rejects.toBeInstanceOf(MediaContentTypeError);
  });
});
