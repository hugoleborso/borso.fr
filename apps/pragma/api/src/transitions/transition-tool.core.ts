export interface TransitionComment {
  readonly songAId: string;
  readonly songBId: string;
  readonly comment: string;
}

export interface TitledSong {
  readonly id: string;
  readonly title: string;
}

export interface TransitionFilter {
  readonly fromId?: string | undefined;
  readonly toId?: string | undefined;
}

export interface TransitionToolView {
  readonly from: string;
  readonly to: string;
  readonly fromId: string;
  readonly toId: string;
  readonly comment: string;
}

function titleOf(songs: readonly TitledSong[], songId: string): string {
  return songs.find((song) => song.id === songId)?.title ?? songId;
}

function isKept(comment: TransitionComment, filter: TransitionFilter): boolean {
  const isFromKept = filter.fromId === undefined || comment.songAId === filter.fromId;
  return isFromKept && (filter.toId === undefined || comment.songBId === filter.toId);
}

// @FollowsBlueprint core-projection
export function projectTransitionComments(
  comments: readonly TransitionComment[],
  songs: readonly TitledSong[],
  filter: TransitionFilter,
): TransitionToolView[] {
  return comments
    .filter((comment) => isKept(comment, filter))
    .map((comment) => ({
      from: titleOf(songs, comment.songAId),
      to: titleOf(songs, comment.songBId),
      fromId: comment.songAId,
      toId: comment.songBId,
      comment: comment.comment,
    }));
}
