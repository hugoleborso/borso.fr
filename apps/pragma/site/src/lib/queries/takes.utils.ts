/** @Feature takes */

export interface OrderedTake {
  readonly id: string;
  readonly recordedAt: string;
}

export interface CountedTake extends OrderedTake {
  readonly commentCount: number;
}

export interface IdentifiedComment {
  readonly id: string;
}

// @FollowsBlueprint utils-pure-module
export function compareTakesNewestFirst(left: OrderedTake, right: OrderedTake): number {
  const byRecordingTime = Date.parse(right.recordedAt) - Date.parse(left.recordedAt);
  if (byRecordingTime !== 0) return byRecordingTime;
  return right.id.localeCompare(left.id);
}

export function insertTakeNewestFirst<TTake extends OrderedTake>(
  takes: readonly TTake[],
  take: TTake,
): TTake[] {
  return [...takes.filter((candidate) => candidate.id !== take.id), take].sort(
    compareTakesNewestFirst,
  );
}

export function removeTakeById<TTake extends OrderedTake>(
  takes: readonly TTake[],
  takeId: string,
): TTake[] {
  return takes.filter((take) => take.id !== takeId);
}

export function shiftCommentCount<TTake extends CountedTake>(
  takes: readonly TTake[],
  takeId: string,
  delta: number,
): TTake[] {
  return takes.map((take) =>
    take.id === takeId ? { ...take, commentCount: Math.max(0, take.commentCount + delta) } : take,
  );
}

export function appendCommentOnce<TComment extends IdentifiedComment>(
  comments: readonly TComment[],
  comment: TComment,
): TComment[] {
  return [...comments.filter((candidate) => candidate.id !== comment.id), comment];
}

export function removeCommentById<TComment extends IdentifiedComment>(
  comments: readonly TComment[],
  commentId: string,
): TComment[] {
  return comments.filter((comment) => comment.id !== commentId);
}
