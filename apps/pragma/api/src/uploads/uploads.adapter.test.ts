/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NotFound, S3Client } from '@aws-sdk/client-s3';
import {
  deleteObjects,
  hasProductionUploadsBucket,
  isStoredInOwnBucket,
  presignGetObject,
  presignPutObject,
  UploadsConfigError,
} from './uploads.adapter';

const PRESERVED_ENV = {
  UPLOADS_BUCKET: process.env.UPLOADS_BUCKET,
  PRODUCTION_UPLOADS_BUCKET: process.env.PRODUCTION_UPLOADS_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

const BUCKET = 'pragma-uploads-test';
const PRODUCTION_BUCKET = 'pragma-prod-uploads';
const EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT = 300;

beforeAll(() => {
  process.env.UPLOADS_BUCKET = BUCKET;
  process.env.AWS_REGION = 'eu-west-3';
  process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PRODUCTION_UPLOADS_BUCKET;
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

describe('presignGetObject from the production bucket', () => {
  it('signs against the production bucket the stage names', async () => {
    process.env.PRODUCTION_UPLOADS_BUCKET = PRODUCTION_BUCKET;
    const url = await presignGetObject({
      objectKey: 'take/song-1/take-1.webm',
      expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
      source: 'production',
    });
    expect(url).toContain(PRODUCTION_BUCKET);
    expect(url).not.toContain(BUCKET);
  });

  it('raises the slice its own error when the stage names no production bucket', async () => {
    await expect(
      presignGetObject({
        objectKey: 'take/song-1/take-1.webm',
        expiresInSeconds: EXPIRES_IN_SECONDS_UNLIKE_THE_PRESIGNER_DEFAULT,
        source: 'production',
      }),
    ).rejects.toThrow(new UploadsConfigError('PRODUCTION_UPLOADS_BUCKET not set'));
  });
});

describe('hasProductionUploadsBucket', () => {
  it('answers whether the stage names a production bucket, an empty name counting as none', () => {
    expect(hasProductionUploadsBucket()).toBe(false);
    process.env.PRODUCTION_UPLOADS_BUCKET = '';
    expect(hasProductionUploadsBucket()).toBe(false);
    process.env.PRODUCTION_UPLOADS_BUCKET = PRODUCTION_BUCKET;
    expect(hasProductionUploadsBucket()).toBe(true);
  });
});

function stubHeadAnswer(answer: () => Promise<unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the adapter calls the promise form, which is what this stub answers
  return vi.spyOn(S3Client.prototype, 'send').mockImplementationOnce(answer);
}

describe('isStoredInOwnBucket', () => {
  it('asks the own bucket for the key and answers true when it holds it', async () => {
    const send = stubHeadAnswer(() => Promise.resolve({}));
    expect(await isStoredInOwnBucket('take/song-1/take-1.webm')).toBe(true);
    const command: unknown = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(Object);
    expect(Reflect.get(Object(command), 'input')).toEqual({
      Bucket: BUCKET,
      Key: 'take/song-1/take-1.webm',
    });
  });

  it('answers false when S3 says the key is not there', async () => {
    stubHeadAnswer(() =>
      Promise.reject(new NotFound({ message: 'Not Found', $metadata: { httpStatusCode: 404 } })),
    );
    expect(await isStoredInOwnBucket('take/song-1/take-1.webm')).toBe(false);
  });

  it('passes any other failure on, so a refused read is not mistaken for a missing object', async () => {
    const refusal = new Error('Access Denied');
    stubHeadAnswer(() => Promise.reject(refusal));
    await expect(isStoredInOwnBucket('take/song-1/take-1.webm')).rejects.toBe(refusal);
  });

  it('raises the slice its own error when the bucket is not configured', async () => {
    delete process.env.UPLOADS_BUCKET;
    await expect(isStoredInOwnBucket('take/song-1/take-1.webm')).rejects.toThrow(
      new UploadsConfigError('UPLOADS_BUCKET not set'),
    );
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

  it('deletes from the own bucket only, even on a stage that reads takes from production', async () => {
    process.env.PRODUCTION_UPLOADS_BUCKET = PRODUCTION_BUCKET;
    const send = stubDeleteAnswers({});
    expect(await deleteObjects(['take/a.webm'])).toEqual([]);
    expect(readDeletedKeys(send, 0)).toEqual({
      Bucket: BUCKET,
      Delete: { Objects: [{ Key: 'take/a.webm' }], Quiet: true },
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
