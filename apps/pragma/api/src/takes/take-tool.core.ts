import type { TakeCommentView, TakeView } from './takes.types';

export interface TakeSummary {
  readonly id: string;
  readonly recordedAt: string;
  readonly by: string | null;
  readonly durationSeconds: number;
  readonly sessionId: string | null;
  readonly comments: number;
}

export interface CommentSummary {
  readonly id: string;
  readonly by: string | null;
  readonly atSeconds: number | null;
  readonly body: string;
}

// @FollowsBlueprint core-projection
export function summarizeTake(take: TakeView): TakeSummary {
  return {
    id: take.id,
    recordedAt: take.recordedAt.toISOString(),
    by: take.authorName,
    durationSeconds: take.durationSeconds,
    sessionId: take.sessionId,
    comments: take.commentCount,
  };
}

// @FollowsBlueprint core-projection
export function summarizeComment(comment: TakeCommentView): CommentSummary {
  return {
    id: comment.id,
    by: comment.authorName,
    atSeconds: comment.atSeconds,
    body: comment.body,
  };
}
