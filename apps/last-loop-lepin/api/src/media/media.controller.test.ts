/**
 * Media controller — happy-path presign exercises S3's presigner, which
 * needs AWS_REGION but not a live bucket: `getSignedUrl` builds the URL
 * locally via SigV4. We only assert the URL shape and the auth gating.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { adminSessionCookie, freshDatabase } from '../../../test/database-utils';
import { createApp } from '../app';

const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});

describe('media controller', () => {
  const app = createApp();

  async function adminCookie(): Promise<string> {
    return adminSessionCookie(freshDatabase());
  }

  it('returns 401 without admin cookie', async () => {
    const response = await app.request('/api/admin/media/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        contentType: 'image/jpeg',
      }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 on an unsupported content type', async () => {
    const cookie = await adminCookie();
    const response = await app.request('/api/admin/media/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        contentType: 'image/heif',
      }),
    });
    expect(response.status).toBe(400);
  });

  it('issues a presigned URL for jpeg', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIA-TEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'TEST-SECRET-KEY-LONG-ENOUGH-FOR-SIGV4';
    process.env.AWS_REGION = 'eu-west-3';
    const cookie = await adminCookie();
    const response = await app.request('/api/admin/media/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        contentType: 'image/jpeg',
      }),
    });
    expect(response.status).toBe(200);
    const body = presignResponseSchema.parse(await response.json());
    expect(body.objectKey).toMatch(/^editions\/lepin-2026\/runners\/alice\/.+\.jpg$/);
    expect(body.uploadUrl).toMatch(/^https:\/\//);
  });
});
