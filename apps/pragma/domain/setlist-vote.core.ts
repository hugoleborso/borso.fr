export const SETLIST_VOTING = 'voting';
export const SETLIST_LOCKED = 'locked';

export const SETLIST_STATUSES = [SETLIST_VOTING, SETLIST_LOCKED] as const;

export type SetlistStatus = (typeof SETLIST_STATUSES)[number];

export const TARGET_SONG_COUNT_MIN = 1;
export const TARGET_SONG_COUNT_MAX = 60;
export const DEFAULT_TARGET_SONG_COUNT = 15;
export const MAX_POINTS_PER_SONG = 3;

const BEFORE = -1;
const AFTER = 1;

export interface RankedTally {
  readonly songId: string;
  readonly points: number;
  readonly voterCount: number;
}

// @FollowsBlueprint domain-shared-selection
export function resolveSetlistStatus(stored: string | null | undefined): SetlistStatus {
  return stored === SETLIST_VOTING ? SETLIST_VOTING : SETLIST_LOCKED;
}

export function compareSongTallies(left: RankedTally, right: RankedTally): number {
  // Stryker disable next-line EqualityOperator: equivalent mutant. The guard on this very line has established that the two point counts differ, so `>` and `>=` answer the same.
  if (right.points !== left.points) return right.points > left.points ? AFTER : BEFORE;
  if (right.voterCount !== left.voterCount) {
    // Stryker disable next-line EqualityOperator: equivalent mutant. The guard above has established that the two voter counts differ, so `>` and `>=` answer the same.
    return right.voterCount > left.voterCount ? AFTER : BEFORE;
  }
  return left.songId.localeCompare(right.songId);
}
