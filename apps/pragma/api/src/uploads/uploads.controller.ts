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
      const minted = await mintChartUpload({
        contentType: input.contentType,
        songId: input.songId,
        now: new Date(),
      });
      return context.json(minted);
    })
    .post('/sign-get', zValidator('json', signGetInputSchema), async (context) => {
      const input = context.req.valid('json');
      const minted = await mintChartGetUrl({ objectKey: input.objectKey, now: new Date() });
      return context.json(minted);
    });
}
