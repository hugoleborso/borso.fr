import { NotFound, S3Client } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';

const PRESIGNER_ENV = {
  AWS_ACCESS_KEY_ID: 'AKIA-PRAGMA-TEST',
  AWS_SECRET_ACCESS_KEY: 'pragma-secret-long-enough-for-sigv4-signing',
  AWS_REGION: 'eu-west-3',
  UPLOADS_BUCKET: 'pragma-test-uploads',
} as const;

const signResponseSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});

const getResponseSchema = z.object({
  getUrl: z.string().url(),
  expiresAt: z.string(),
});

async function signTakeRead(objectKey: string): Promise<string> {
  const { app, cookieHeader } = await buildAuthenticatedApp();
  const response = await jsonRequest(app, '/api/uploads/sign-get', {
    method: 'POST',
    body: { objectKey },
    cookieHeader,
  });
  expect(response.status).toBe(200);
  return new URL((await readJson(response, getResponseSchema)).getUrl).hostname;
}

// @FollowsBlueprint test-back-e2e
describe('uploads controller (back-e2e)', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const [name, value] of Object.entries(PRESIGNER_ENV)) {
      previous[name] = process.env[name];
      process.env[name] = value;
    }
  });

  afterEach(() => {
    for (const name of Object.keys(PRESIGNER_ENV)) {
      const saved = previous[name];
      if (saved === undefined) delete process.env[name];
      else process.env[name] = saved;
    }
    delete process.env.PRODUCTION_UPLOADS_BUCKET;
    vi.restoreAllMocks();
  });

  it('rejects /sign without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign', {
      method: 'POST',
      body: { contentType: 'application/pdf', contentLength: 1024 },
    });
    expect(response.status).toBe(401);
  });

  it('mints a presigned PUT URL for an allowed content type', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign', {
      method: 'POST',
      body: {
        contentType: 'application/pdf',
        contentLength: 2048,
        songId: '11111111-1111-1111-1111-111111111111',
      },
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const body = await readJson(response, signResponseSchema);
    expect(body.objectKey).toMatch(/^chart\/11111111-1111-1111-1111-111111111111\/.+\.pdf$/);
    expect(body.uploadUrl).toMatch(/^https:\/\//);
  });

  it('mints a presigned PUT URL for jpeg with the jpg extension', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign', {
      method: 'POST',
      body: { contentType: 'image/jpeg', contentLength: 4096 },
      cookieHeader,
    });
    const body = await readJson(response, signResponseSchema);
    expect(body.objectKey).toMatch(/\.jpg$/);
  });

  it('rejects an unsupported content type', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign', {
      method: 'POST',
      body: { contentType: 'image/gif', contentLength: 1024 },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('rejects content-length over the 10 MiB ceiling', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign', {
      method: 'POST',
      body: { contentType: 'application/pdf', contentLength: 11 * 1024 * 1024 },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('mints a presigned GET URL for an existing object key', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/uploads/sign-get', {
      method: 'POST',
      body: { objectKey: 'chart/abc/def.pdf' },
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const body = await readJson(response, getResponseSchema);
    expect(body.getUrl).toMatch(/^https:\/\//);
  });

  it('signs a take absent from the preview bucket against the production bucket', async () => {
    process.env.PRODUCTION_UPLOADS_BUCKET = 'pragma-prod-uploads';
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the adapter calls the promise form, which is what this stub answers
    vi.spyOn(S3Client.prototype, 'send').mockImplementationOnce(() =>
      Promise.reject(new NotFound({ message: 'Not Found', $metadata: {} })),
    );
    expect(await signTakeRead('take/song-1/take-1.webm')).toContain('pragma-prod-uploads');
  });

  it('signs a take recorded on the preview against the preview bucket', async () => {
    process.env.PRODUCTION_UPLOADS_BUCKET = 'pragma-prod-uploads';
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the adapter calls the promise form, which is what this stub answers
    vi.spyOn(S3Client.prototype, 'send').mockImplementationOnce(() => Promise.resolve({}));
    expect(await signTakeRead('take/song-1/take-1.webm')).toContain('pragma-test-uploads');
  });

  it('never asks S3 on a stage with no production bucket, as on production itself', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send');
    expect(await signTakeRead('take/song-1/take-1.webm')).toContain('pragma-test-uploads');
    expect(send).not.toHaveBeenCalled();
  });
});
