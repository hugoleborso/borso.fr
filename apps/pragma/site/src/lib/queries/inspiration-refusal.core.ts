/** @Feature inspirations */

import { z } from 'zod';
import { ApiError } from '../api.client';

export interface SketchUsingInspiration {
  readonly compositionId: string;
  readonly title: string;
}

export type InspirationRefusal =
  | { readonly kind: 'inspiration-in-use'; readonly sketches: readonly SketchUsingInspiration[] }
  | { readonly kind: 'inspiration-not-found' }
  | { readonly kind: 'unknown' };

const inspirationRefusalBodySchema = z.discriminatedUnion('error', [
  z.object({
    error: z.literal('inspiration-in-use'),
    sketches: z.array(z.object({ compositionId: z.string(), title: z.string() })),
  }),
  z.object({ error: z.literal('inspiration-not-found') }),
]);

// @FollowsBlueprint core-failure-code-from-an-untrusted-body
export function readInspirationRefusal(error: unknown): InspirationRefusal {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const refusal = inspirationRefusalBodySchema.safeParse(body);
  if (!refusal.success) return { kind: 'unknown' };
  if (refusal.data.error === 'inspiration-in-use') {
    return { kind: 'inspiration-in-use', sketches: refusal.data.sketches };
  }
  return { kind: 'inspiration-not-found' };
}

export function isInspirationDeletedMeanwhile(error: unknown): boolean {
  return readInspirationRefusal(error).kind === 'inspiration-not-found';
}
