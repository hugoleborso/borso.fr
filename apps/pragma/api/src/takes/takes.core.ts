import { takeFileExtensionOf, type TakeContentType } from '@domain/take-upload.core';

export const TAKE_OBJECT_PREFIX = 'take';

export interface TakeObjectKeyParams {
  readonly songId: string;
  readonly takeId: string;
  readonly contentType: TakeContentType;
}

export function buildTakeObjectKey(params: TakeObjectKeyParams): string {
  const extension = takeFileExtensionOf(params.contentType);
  return `${TAKE_OBJECT_PREFIX}/${params.songId}/${params.takeId}.${extension}`;
}

// @FollowsBlueprint core-decision
export function isMomentWithinTake(atSeconds: number | null, durationSeconds: number): boolean {
  if (atSeconds === null) return true;
  return Number.isInteger(atSeconds) && atSeconds >= 0 && atSeconds <= durationSeconds;
}

export interface TimedComment {
  readonly id: string;
  readonly createdAt: Date;
}

// @FollowsBlueprint core-canonical-ordering
export function orderCommentsByTime<Comment extends TimedComment>(
  comments: readonly Comment[],
): Comment[] {
  return comments.toSorted((first, second) => {
    const timeDifference = first.createdAt.getTime() - second.createdAt.getTime();
    if (timeDifference !== 0) return timeDifference;
    return first.id.localeCompare(second.id);
  });
}
