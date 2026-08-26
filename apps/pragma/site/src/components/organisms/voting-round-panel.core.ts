/** @Feature audience-voting */

const VOTE_PATH_PREFIX = '/vote/';
const TIME_LABEL_SLICE_START = 11;
const TIME_LABEL_SLICE_END = 16;

export interface RoundHistoryRow {
  readonly id: string;
  readonly openedAt: string;
  readonly winningSongId: string | null;
}

export interface NamedSong {
  readonly id: string;
  readonly title: string;
}

export interface RoundHistoryLine {
  readonly roundId: string;
  readonly openedAtLabel: string;
  readonly winnerTitle: string | null;
}

export function buildVoteAddress(origin: string, sessionId: string): string {
  return `${origin}${VOTE_PATH_PREFIX}${sessionId}`;
}

// @FollowsBlueprint core-projection
export function selectRoundHistoryLines(
  rounds: readonly RoundHistoryRow[],
  songs: readonly NamedSong[],
): RoundHistoryLine[] {
  const titleBySongId = new Map(songs.map((song) => [song.id, song.title]));
  return rounds.map((round) => ({
    roundId: round.id,
    openedAtLabel: round.openedAt.slice(TIME_LABEL_SLICE_START, TIME_LABEL_SLICE_END),
    winnerTitle:
      round.winningSongId === null ? null : (titleBySongId.get(round.winningSongId) ?? null),
  }));
}
