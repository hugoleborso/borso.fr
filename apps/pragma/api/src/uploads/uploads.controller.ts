/**
 * Uploads endpoints — presigned PUT for new chart uploads, presigned
 * GET for rendering existing charts. Both are gated by the shared
 * session middleware (mounted in `app.ts`).
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { signGetInputSchema, signUploadInputSchema } from './uploads.schema';
import { mintChartGetUrl, mintChartUpload } from './uploads.service';

// @FollowsBlueprint controller-dispatch
export function buildUploadsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .post('/sign', zValidator('json', signUploadInputSchema), async (context) => {
      const input = context.req.valid('json');
      const result = await mintChartUpload({
        contentType: input.contentType,
        songId: input.songId,
        now: new Date(),
      });
      return context.json(result);
    })
    .post('/sign-get', zValidator('json', signGetInputSchema), async (context) => {
      const input = context.req.valid('json');
      const result = await mintChartGetUrl({ objectKey: input.objectKey, now: new Date() });
      return context.json(result);
    });
}
