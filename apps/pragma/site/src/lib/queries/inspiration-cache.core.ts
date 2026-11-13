/** @Feature inspirations */

export interface InspirationFieldsShape {
  readonly youtubeVideoId: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerTrackId: string | null;
  readonly deezerAlbumId: string | null;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly note: string;
}

export interface InspirationShape extends InspirationFieldsShape {
  readonly id: string;
  readonly authorMemberId: string | null;
  readonly authorName: string | null;
  readonly createdAt: string;
  readonly sketchCount: number;
}

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
