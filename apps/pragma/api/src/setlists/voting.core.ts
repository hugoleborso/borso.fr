export const POINTS_PER_TARGET_SONG = 3;
export const DEFAULT_TARGET_SONG_COUNT = 15;

export interface CastVote {
  readonly memberId: string;
  readonly songId: string;
  readonly points: number;
}

const BEFORE = -1;
const AFTER = 1;

export interface VoteBudget {
  readonly total: number;
  readonly spent: number;
  readonly remaining: number;
}

export interface SongTally {
  readonly songId: string;
  readonly points: number;
  readonly voterCount: number;
  readonly pointsByMember: Readonly<Record<string, number>>;
}

export type ScoreVerdict =
  { kind: 'accepted'; budget: VoteBudget } | { kind: 'budget-exhausted'; budget: VoteBudget };

export function resolveTargetSongCount(stored: number | null): number {
  return stored ?? DEFAULT_TARGET_SONG_COUNT;
}

// @FollowsBlueprint core-decision
export function computeBudget(
  targetSongCount: number | null,
  votesOfMember: readonly CastVote[],
): VoteBudget {
  const total = resolveTargetSongCount(targetSongCount) * POINTS_PER_TARGET_SONG;
  const spent = votesOfMember.reduce((running, vote) => running + vote.points, 0);
  return { total, spent, remaining: total - spent };
}

export function judgeScore(
  targetSongCount: number | null,
  votesOfMember: readonly CastVote[],
  songId: string,
  points: number,
): ScoreVerdict {
  const otherSongs = votesOfMember.filter((vote) => vote.songId !== songId);
  const budgetOnOtherSongs = computeBudget(targetSongCount, otherSongs);
  if (points > budgetOnOtherSongs.remaining) {
    return { kind: 'budget-exhausted', budget: computeBudget(targetSongCount, votesOfMember) };
  }
  return {
    kind: 'accepted',
    budget: {
      total: budgetOnOtherSongs.total,
      spent: budgetOnOtherSongs.spent + points,
      remaining: budgetOnOtherSongs.remaining - points,
    },
  };
}

export function tally(votes: readonly CastVote[]): SongTally[] {
  const bySong = new Map<string, { points: number; pointsByMember: Record<string, number> }>();
  for (const vote of votes) {
    if (vote.points <= 0) continue;
    const running = bySong.get(vote.songId) ?? { points: 0, pointsByMember: {} };
    running.points += vote.points;
    running.pointsByMember[vote.memberId] = vote.points;
    bySong.set(vote.songId, running);
  }
  return [...bySong.entries()]
    .map(([songId, running]) => ({
      songId,
      points: running.points,
      voterCount: Object.keys(running.pointsByMember).length,
      pointsByMember: running.pointsByMember,
    }))
    .toSorted(compareTallies);
}

function compareTallies(left: SongTally, right: SongTally): number {
  // Stryker disable next-line EqualityOperator: equivalent mutant. The guard on this very line has established that the two point counts differ, so `>` and `>=` answer the same.
  if (right.points !== left.points) return right.points > left.points ? AFTER : BEFORE;
  if (right.voterCount !== left.voterCount) {
    // Stryker disable next-line EqualityOperator: equivalent mutant. The guard above has established that the two voter counts differ, so `>` and `>=` answer the same.
    return right.voterCount > left.voterCount ? AFTER : BEFORE;
  }
  return left.songId.localeCompare(right.songId);
}

export function proposeClosing(
  tallies: readonly SongTally[],
  targetSongCount: number | null,
): SongTally[] {
  const target = resolveTargetSongCount(targetSongCount);
  const ranked = [...tallies].toSorted(compareTallies);
  const boundaryPoints = ranked[target - 1]?.points;
  return ranked.filter((entry, index) => index < target || entry.points === boundaryPoints);
}

export type ScoreWriteIntent = 'remove' | 'store';

export function selectScoreWriteIntent(points: number): ScoreWriteIntent {
  return points === 0 ? 'remove' : 'store';
}

export function selectTargetSongCount(
  requested: number | null,
  stored: number | null,
): number | null {
  return requested ?? stored;
}

export type WriteOutcome = 'written' | 'missing';

export function selectWriteOutcome(updatedRowCount: number): WriteOutcome {
  return updatedRowCount === 0 ? 'missing' : 'written';
}
