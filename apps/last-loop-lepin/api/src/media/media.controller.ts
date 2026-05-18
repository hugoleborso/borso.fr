import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAdminSession } from '../auth/auth.middleware';
import { MediaConfigError, MediaContentTypeError } from './media.s3';
import { presignRunnerPhotoUpload } from './media.service';

const presignInputSchema = z.object({
  editionSlug: z.string().min(3).max(64),
  runnerSlug: z.string().min(2).max(64),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

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
      if (error instanceof MediaContentTypeError) return context.json({ error: error.message }, 400);
      throw error;
    }
  });

export { mediaRouter };
