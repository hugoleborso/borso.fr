/**
 * Upload-URL stubs. The real CDK stack (item 9 of the plan) wires an
 * S3 bucket and presigned PUTs; for now this controller returns a
 * synthetic key + URL so the front-end can be implemented and
 * back-e2e tested end-to-end. The contract is:
 *
 *   POST /api/uploads/chord-chart        { contentType, ext }
 *     -> { s3Key, uploadUrl }
 *   POST /api/uploads/avatar             { contentType, ext }
 *     -> { s3Key, uploadUrl }
 *
 * The stub URL is `s3://pragma-uploads-stub/<s3Key>` — front-end code
 * treats it as opaque and never assumes it is fetchable.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const CHORD_CHART_PREFIX = 'chord-charts';
const AVATAR_PREFIX = 'avatars';

const uploadRequestSchema = z.object({
  contentType: z.string().min(1).max(128),
  ext: z.string().min(1).max(8).regex(/^[a-zA-Z0-9]+$/),
});

function buildStubKey(prefix: string, ext: string): string {
  const random = randomBytes(16).toString('hex');
  return `${prefix}/${random}.${ext}`;
}

export function buildUploadsRouter(): Hono {
  const router = new Hono();

  router.post('/chord-chart', zValidator('json', uploadRequestSchema), (context) => {
    const { ext } = context.req.valid('json');
    const s3Key = buildStubKey(CHORD_CHART_PREFIX, ext);
    return context.json({ s3Key, uploadUrl: `s3://pragma-uploads-stub/${s3Key}` });
  });

  router.post('/avatar', zValidator('json', uploadRequestSchema), (context) => {
    const { ext } = context.req.valid('json');
    const s3Key = buildStubKey(AVATAR_PREFIX, ext);
    return context.json({ s3Key, uploadUrl: `s3://pragma-uploads-stub/${s3Key}` });
  });

  return router;
}
