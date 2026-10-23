/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import {
  deleteObjects,
  presignGetObject,
  presignPutObject,
  UploadsConfigError,
} from './uploads.adapter';

const PRESERVED_ENV = {
  UPLOADS_BUCKET: process.env.UPLOADS_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

const BUCKET = 'pragma-uploads-test';
const EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT = 300;

beforeAll(() => {
  process.env.UPLOADS_BUCKET = BUCKET;
  process.env.AWS_REGION = 'eu-west-3';
  process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
});

afterEach(() => {
  vi.restoreAllMocks();
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
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
    });
    expect(url).toContain(BUCKET);
    expect(url).toContain('charts/song-1.pdf');
    expect(url).toContain(`X-Amz-Expires=${EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT}`);
  });

  it('leaves the length unsigned when none is given, as a chart upload does', async () => {
    const url = await presignPutObject({
      objectKey: 'charts/song-1.pdf',
      contentType: 'application/pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
    });
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('host');
  });

  it('signs the declared length, so S3 refuses a body of any other size', async () => {
    const url = await presignPutObject({
      objectKey: 'take/song-1/take-1.webm',
      contentType: 'audio/webm',
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
      contentLength: 2_048,
    });
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;host');
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(
      presignPutObject({
        objectKey: 'charts/song-1.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
      }),
    ).rejects.toThrow(new UploadsConfigError('UPLOADS_BUCKET not set'));
    await expect(
      presignPutObject({
        objectKey: 'charts/song-1.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
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
        expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
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
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
    });
    expect(url).toContain('us-east-1');
    process.env.AWS_REGION = 'eu-west-3';
  });

  it('falls back to the deployment region when a freshly imported module finds none in the environment, the client being cached for the life of the module', async () => {
    vi.resetModules();
    delete process.env.AWS_REGION;
    const freshModule = await import('./uploads.adapter');
    const url = await freshModule.presignGetObject({
      objectKey: 'charts/song-1.pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
    });
    expect(url).toContain('eu-west-3');
    process.env.AWS_REGION = 'eu-west-3';
  });
});

describe('presignGetObject', () => {
  it('signs a readable URL for the same object', async () => {
    const url = await presignGetObject({
      objectKey: 'charts/song-1.pdf',
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
    });
    expect(url).toContain(BUCKET);
    expect(url).toContain('charts/song-1.pdf');
    expect(url).toContain(`X-Amz-Expires=${EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT}`);
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(
      presignGetObject({
        objectKey: 'charts/song-1.pdf',
        expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
      }),
    ).rejects.toThrow(new UploadsConfigError('UPLOADS_BUCKET not set'));
    process.env.UPLOADS_BUCKET = BUCKET;
  });
});

const DELETE_BATCH_SIZE = 1_000;

function stubDeleteAnswers(...answers: readonly unknown[]) {
  const send = vi.spyOn(S3Client.prototype, 'send');
  for (const answer of answers) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the adapter calls the promise form, which is what this stub answers
    send.mockImplementationOnce(() => Promise.resolve(answer));
  }
  return send;
}

function readDeletedKeys(send: ReturnType<typeof stubDeleteAnswers>, callIndex: number): unknown {
  const command: unknown = send.mock.calls[callIndex]?.[0];
  if (typeof command !== 'object' || command === null) return undefined;
  return Reflect.get(command, 'input');
}

describe('deleteObjects', () => {
  it('sends nothing at all for an empty list', async () => {
    const send = stubDeleteAnswers();
    expect(await deleteObjects([])).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('deletes every key from the configured bucket in one quiet request', async () => {
    const send = stubDeleteAnswers({});
    expect(await deleteObjects(['take/a.webm', 'take/b.mp4'])).toEqual([]);
    expect(readDeletedKeys(send, 0)).toEqual({
      Bucket: BUCKET,
      Delete: { Objects: [{ Key: 'take/a.webm' }, { Key: 'take/b.mp4' }], Quiet: true },
    });
  });

  it('answers the keys S3 could not delete, skipping a failure that names none', async () => {
    stubDeleteAnswers({ Errors: [{ Key: 'take/b.mp4', Code: 'AccessDenied' }, { Code: 'Other' }] });
    expect(await deleteObjects(['take/a.webm', 'take/b.mp4'])).toEqual(['take/b.mp4']);
  });

  it('splits more than a thousand keys into requests of a thousand, the most S3 accepts', async () => {
    const keys = Array.from({ length: DELETE_BATCH_SIZE + 1 }, (_, index) => `take/${index}.webm`);
    const send = stubDeleteAnswers({}, { Errors: [{ Key: 'take/1000.webm' }] });
    expect(await deleteObjects(keys)).toEqual(['take/1000.webm']);
    expect(send).toHaveBeenCalledTimes(2);
    expect(readDeletedKeys(send, 1)).toEqual({
      Bucket: BUCKET,
      Delete: { Objects: [{ Key: 'take/1000.webm' }], Quiet: true },
    });
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(deleteObjects(['take/a.webm'])).rejects.toThrow(
      new UploadsConfigError('UPLOADS_BUCKET not set'),
    );
    process.env.UPLOADS_BUCKET = BUCKET;
  });
});
