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

export interface VoteBoard {
  readonly status: 'voting' | 'locked';
  readonly targetSongCount: number;
  readonly budget: VoteBudget;
  readonly tallies: readonly SongTally[];
  readonly lastScoredAt: string | null;
}

function withoutMember(
  pointsByMember: Readonly<Record<string, number>>,
  memberId: string,
): Record<string, number> {
  const kept: Record<string, number> = {};
  for (const [candidate, points] of Object.entries(pointsByMember)) {
    if (candidate !== memberId) kept[candidate] = points;
  }
  return kept;
}

function rebuildTally(tally: SongTally, pointsByMember: Record<string, number>): SongTally {
  const values = Object.values(pointsByMember);
  return {
    songId: tally.songId,
    points: values.reduce((running, points) => running + points, 0),
    voterCount: values.length,
    pointsByMember,
  };
}

export function readMemberPoints(board: VoteBoard, memberId: string, songId: string): number {
  const tally = board.tallies.find((candidate) => candidate.songId === songId);
  return tally?.pointsByMember[memberId] ?? 0;
}

// @FollowsBlueprint utils-pure-module
export function applyScoreToBoard(
  board: VoteBoard,
  memberId: string,
  songId: string,
  points: number,
): VoteBoard {
  const previousPoints = readMemberPoints(board, memberId, songId);
  const existing = board.tallies.find((candidate) => candidate.songId === songId);
  const kept = withoutMember(existing?.pointsByMember ?? {}, memberId);
  const pointsByMember = points > 0 ? { ...kept, [memberId]: points } : kept;
  const rebuilt = rebuildTally(
    existing ?? { songId, points: 0, voterCount: 0, pointsByMember: {} },
    pointsByMember,
  );
  const others = board.tallies.filter((candidate) => candidate.songId !== songId);
  const tallies = rebuilt.voterCount === 0 ? others : [...others, rebuilt];
  const spent = board.budget.spent - previousPoints + points;
  return {
    ...board,
    budget: { total: board.budget.total, spent, remaining: board.budget.total - spent },
    tallies: tallies.toSorted(compareTallies),
  };
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
