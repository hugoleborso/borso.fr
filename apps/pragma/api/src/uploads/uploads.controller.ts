/**
 * Upload-URL stubs. Returns `{ s3Key, uploadUrl }` pairs the
 * front-end keeps opaque. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { uploadRequestSchema } from './uploads.schema';
import { mintAvatarUpload, mintChordChartUpload } from './uploads.service';

export function buildUploadsRouter(): Hono {
  const router = new Hono();

  router.post('/chord-chart', zValidator('json', uploadRequestSchema), (context) => {
    const { ext } = context.req.valid('json');
    return context.json(mintChordChartUpload(ext));
  });

  router.post('/avatar', zValidator('json', uploadRequestSchema), (context) => {
    const { ext } = context.req.valid('json');
    return context.json(mintAvatarUpload(ext));
  });

  return router;
}
