/** @Feature inspirations */

import type { InferResponseType } from 'hono/client';
import type { api } from '../api.client';

type InspirationsListResponse = InferResponseType<typeof api.api.inspirations.$get, 200>;
export type InspirationShape = InspirationsListResponse['inspirations'][number];
export type InspirationFieldsShape = Parameters<
  (typeof api.api.inspirations)[':id']['$patch']
>[0]['json'];

export interface InspirationAuthor {
  readonly memberId: string;
  readonly firstName: string;
}

// @FollowsBlueprint core-view-projection
export function buildOptimisticInspiration(
  inspiration: InspirationFieldsShape & { readonly id: string },
  author: InspirationAuthor | null,
  createdAt: string,
): InspirationShape {
  return {
    ...inspiration,
    authorMemberId: author?.memberId ?? null,
    authorName: author?.firstName ?? null,
    createdAt,
    sketchCount: 0,
  };
}

export function mergeInspirationChanges<Inspiration extends InspirationShape>(
  inspiration: Inspiration,
  changes: InspirationFieldsShape,
): Inspiration {
  return { ...inspiration, ...changes };
}
