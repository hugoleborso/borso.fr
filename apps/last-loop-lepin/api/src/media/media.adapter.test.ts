/**
 * @vitest-environment node
 *
 * @Blueprint test-node-adapter
 * @BlueprintName Node Environment Adapter Test
 * @BlueprintUsage Use for a module that talks to a vendor SDK or reads `process.env`, so it runs under node rather than the default browser-like environment.
 * @BlueprintDescription Declares `@vitest-environment node` in the file's first docblock, which is the only place vitest reads it, then saves the environment variables the SDK needs into `PRESERVED_ENV`, sets them for the suite and restores them afterwards, so a variable this suite sets cannot leak into another file.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPresignedUpload, MediaConfigError, MediaContentTypeError } from './media.adapter';

const PRESERVED_ENV: Record<string, string | undefined> = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  PHOTOS_BUCKET: process.env.PHOTOS_BUCKET,
};

describe('media.adapter', () => {
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
    expect(jpeg.objectKey).toMatch(/^editions\/lepin-2026\/runners\/alice\/[0-9a-f-]+\.jpg$/);
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
    const presignedUpload = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      now,
    );
    const fiveMinutesMs = 5 * 60 * 1000;
    expect(presignedUpload.expiresAt.getTime()).toBe(now.getTime() + fiveMinutesMs);
  });
  it('falls back to the deployment region when the environment names none', async () => {
    // The client is cached for the life of the module, so the region is read
    // exactly once — on a module that has already signed something, the
    // fallback is unreachable however the environment is set.
    vi.resetModules();
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    delete process.env.AWS_REGION;
    const freshModule = await import('./media.adapter');
    const presignedUpload = await freshModule.createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      new Date(),
    );
    expect(presignedUpload.uploadUrl).toContain('eu-west-3');
    process.env.AWS_REGION = 'eu-west-3';
  });
  it('names its own error rather than the vendor when the bucket is missing', async () => {
    delete process.env.PHOTOS_BUCKET;
    await expect(
      createPresignedUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
        new Date(),
      ),
    ).rejects.toMatchObject({ name: 'MediaConfigError', message: 'PHOTOS_BUCKET not set' });
  });

  it('treats an empty bucket name as no bucket at all', async () => {
    process.env.PHOTOS_BUCKET = '';
    await expect(
      createPresignedUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
        new Date(),
      ),
    ).rejects.toMatchObject({ name: 'MediaConfigError' });
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
  });

  it('names the content type it refused, so the caller can report it', async () => {
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    await expect(
      createPresignedUpload(
        { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/heif' },
        new Date(),
      ),
    ).rejects.toMatchObject({
      name: 'MediaContentTypeError',
      message: 'unsupported content type: image/heif',
    });
  });

  it('signs a URL that expires with the presign window rather than the default', async () => {
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    const presignedUpload = await createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      new Date(),
    );
    expect(presignedUpload.uploadUrl).toContain('X-Amz-Expires=300');
  });

  it('signs against the region the environment names', async () => {
    vi.resetModules();
    process.env.PHOTOS_BUCKET = 'lastloop-test-bucket';
    process.env.AWS_REGION = 'us-east-1';
    const freshModule = await import('./media.adapter');
    const presignedUpload = await freshModule.createPresignedUpload(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', contentType: 'image/jpeg' },
      new Date(),
    );
    expect(presignedUpload.uploadUrl).toContain('us-east-1');
    // This is the one test that re-imports the module, so it is the only place
    // a value computed once at module load can be observed under a mutation.
    expect(presignedUpload.uploadUrl).toContain('X-Amz-Expires=300');
    process.env.AWS_REGION = 'eu-west-3';
  });
});
