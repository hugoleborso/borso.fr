/**
 * @vitest-environment node
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MediaConfigError, MediaContentTypeError, createPresignedUpload } from './media.s3';

const PRESERVED_ENV: Record<string, string | undefined> = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  PHOTOS_BUCKET: process.env.PHOTOS_BUCKET,
};

describe('media.s3', () => {
  beforeAll(() => {
    process.env.AWS_REGION = 'eu-west-3';
    process.env.AWS_ACCESS_KEY_ID = 'AKIA-TEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'TEST-SECRET-KEY-LONG-ENOUGH-FOR-SIGV4';
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

  it('throws MediaConfigError when PHOTOS_BUCKET is missing', async () => {
    delete process.env.PHOTOS_BUCKET;
    await expect(
      createPresignedUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
        new Date(),
      ),
    ).rejects.toBeInstanceOf(MediaConfigError);
  });

  it('rejects unsupported content types', async () => {
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    await expect(
      createPresignedUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/heif' },
        new Date(),
      ),
    ).rejects.toBeInstanceOf(MediaContentTypeError);
  });

  it('builds a key under editions/<slug>/runners/<slug>/<uuid>.<ext>', async () => {
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    const jpeg = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      new Date(),
    );
    expect(jpeg.objectKey).toMatch(
      /^editions\/lepin-2026\/runners\/alice\/[0-9a-f-]+\.jpg$/,
    );
    const png = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/png' },
      new Date(),
    );
    expect(png.objectKey).toMatch(/\.png$/);
    const webp = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/webp' },
      new Date(),
    );
    expect(webp.objectKey).toMatch(/\.webp$/);
  });

  it('sets expiresAt 5 minutes ahead of `now`', async () => {
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    const now = new Date('2026-09-19T06:00:00+02:00');
    const result = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      now,
    );
    const fiveMinutesMs = 5 * 60 * 1000;
    expect(result.expiresAt.getTime()).toBe(now.getTime() + fiveMinutesMs);
  });
});
