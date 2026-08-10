import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireAdminSession } from '../auth/auth.middleware';
import { presignInputSchema } from './media.schema';
import { MediaConfigError, MediaContentTypeError, presignRunnerPhotoUpload } from './media.service';

// @FollowsBlueprint controller-guarded-router
const mediaRouter = new Hono()
  .use('*', requireAdminSession)
  .post('/presign', zValidator('json', presignInputSchema), async (context) => {
    try {
      const result = await presignRunnerPhotoUpload(context.req.valid('json'), new Date());
      return context.json({
        uploadUrl: result.uploadUrl,
        objectKey: result.objectKey,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof MediaConfigError) return context.json({ error: error.message }, 500);
      if (error instanceof MediaContentTypeError)
        return context.json({ error: error.message }, 400);
      throw error;
    }
  });

export { mediaRouter };
