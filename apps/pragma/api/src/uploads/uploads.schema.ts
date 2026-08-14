/**
 * Zod input schemas for the uploads bounded context. The presigned-PUT
 * endpoint enforces an allow-list of content types + a 10 MiB ceiling
 * on the client-declared content-length. The signed-GET endpoint
 * accepts an opaque object key the FE received from a previous sign.
 */

import { z } from 'zod';
import { ALLOWED_UPLOAD_CONTENT_TYPES, MAX_UPLOAD_BYTES } from './uploads.types';

/**
 * @Blueprint schema-input-only
 * @BlueprintName Schema Without A Table
 * @BlueprintUsage Use for a slice that persists nothing and still declares its input schema in the usual place.
 * @BlueprintDescription Keeps the request schemas in `<slice>.schema.ts` even though the slice owns no table, so a reader opens the same filename for every slice. The allowed content types and the size ceiling are imported from `uploads.types.ts`, which makes the Zod enum and the runtime constant the one list.
 */
export const signUploadInputSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES),
  contentLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  contentSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  songId: z.string().uuid().optional(),
});

export const signGetInputSchema = z.object({
  objectKey: z.string().min(1).max(512),
});
