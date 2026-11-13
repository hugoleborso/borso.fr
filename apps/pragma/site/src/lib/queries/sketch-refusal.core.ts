/** @Feature sketches */

import { SKETCH_REFUSALS, type SketchRefusal } from '@domain/sketch.core';
import { z } from 'zod';
import { ApiError } from '../api.client';

const sketchRefusalBodySchema = z.object({ error: z.enum(SKETCH_REFUSALS) });

// @FollowsBlueprint core-failure-code-from-an-untrusted-body
export function readSketchRefusal(error: unknown): SketchRefusal | null {
  if (!(error instanceof ApiError)) return null;
  const refusal = sketchRefusalBodySchema.safeParse(error.body);
  return refusal.success ? refusal.data.error : null;
}
