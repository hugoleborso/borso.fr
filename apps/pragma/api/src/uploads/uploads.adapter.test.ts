/**
 * @vitest-environment node
 *
 * The presigner signs locally: no request leaves the process, so the URL it
 * returns can be read back for the bucket, the key and the lifetime without a
 * network or an AWS account.
 */

// @FollowsBlueprint test-node-adapter

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { presignGetObject, presignPutObject, UploadsConfigError } from './uploads.adapter';

const PRESERVED_ENV = {
  UPLOADS_BUCKET: process.env.UPLOADS_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

const BUCKET = 'pragma-uploads-test';
// Deliberately not 900: that is the presigner's own default, so a test using it
// cannot tell a lifetime that was passed from one that was never passed.
const EXPIRES_IN_SECONDS = 300;

beforeAll(() => {
  process.env.UPLOADS_BUCKET = BUCKET;
  process.env.AWS_REGION = 'eu-west-3';
  process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
});

afterAll(() => {
  for (const [name, value] of Object.entries(PRESERVED_ENV)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('presignPutObject', () => {
  it('signs a URL pinned to the bucket, the key and the lifetime', async () => {
    const url = await presignPutObject({
      objectKey: 'charts/song-1.pdf',
      contentType: 'application/pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
    expect(url).toContain(BUCKET);
    expect(url).toContain('charts/song-1.pdf');
    expect(url).toContain(`X-Amz-Expires=${EXPIRES_IN_SECONDS}`);
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(
      presignPutObject({
        objectKey: 'charts/song-1.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS,
      }),
    ).rejects.toThrow(new UploadsConfigError('UPLOADS_BUCKET not set'));
    await expect(
      presignPutObject({
        objectKey: 'charts/song-1.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS,
      }),
    ).rejects.toMatchObject({ name: 'UploadsConfigError' });
    process.env.UPLOADS_BUCKET = BUCKET;
  });

  it('treats an empty bucket name as no bucket at all', async () => {
    process.env.UPLOADS_BUCKET = '';
    await expect(
      presignPutObject({
        objectKey: 'charts/song-1.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS,
      }),
    ).rejects.toThrow(new UploadsConfigError('UPLOADS_BUCKET not set'));
    process.env.UPLOADS_BUCKET = BUCKET;
  });
});

describe('the S3 client', () => {
  it('signs against the region the environment names', async () => {
    vi.resetModules();
    process.env.AWS_REGION = 'us-east-1';
    const freshModule = await import('./uploads.adapter');
    const url = await freshModule.presignGetObject({
      objectKey: 'charts/song-1.pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
    expect(url).toContain('us-east-1');
    process.env.AWS_REGION = 'eu-west-3';
  });

  it('falls back to the deployment region when the environment names none', async () => {
    // The client is cached for the life of the module, so the region is read
    // exactly once — on a module that has already signed something, the
    // fallback is unreachable however the environment is set.
    vi.resetModules();
    delete process.env.AWS_REGION;
    const freshModule = await import('./uploads.adapter');
    const url = await freshModule.presignGetObject({
      objectKey: 'charts/song-1.pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
    expect(url).toContain('eu-west-3');
    process.env.AWS_REGION = 'eu-west-3';
  });
});

describe('presignGetObject', () => {
  it('signs a readable URL for the same object', async () => {
    const url = await presignGetObject({
      objectKey: 'charts/song-1.pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
    expect(url).toContain(BUCKET);
    expect(url).toContain('charts/song-1.pdf');
    expect(url).toContain(`X-Amz-Expires=${EXPIRES_IN_SECONDS}`);
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(
      presignGetObject({ objectKey: 'charts/song-1.pdf', expiresInSeconds: EXPIRES_IN_SECONDS }),
    ).rejects.toThrow(new UploadsConfigError('UPLOADS_BUCKET not set'));
    process.env.UPLOADS_BUCKET = BUCKET;
  });
});
