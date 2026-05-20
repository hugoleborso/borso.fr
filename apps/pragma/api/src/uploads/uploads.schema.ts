/**
 * Schema for the uploads bounded context. No DB table — uploads
 * mints presigned PUT URLs (or stub URLs in v1) and returns a
 * `{ s3Key, uploadUrl }` pair; the front-end keeps the key opaque.
 */

import { z } from 'zod';

export const uploadRequestSchema = z.object({
  contentType: z.string().min(1).max(128),
  ext: z.string().min(1).max(8).regex(/^[a-zA-Z0-9]+$/),
});
