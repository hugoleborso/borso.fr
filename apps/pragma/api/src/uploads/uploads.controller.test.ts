import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
