/** @Feature audience-voting */

const VOTE_PATH_PREFIX = '/vote/';
const PERCENT_SCALE = 100;
const NO_ROOM_COUNTED = 0;
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
  const titleBySongId = new Map<string | null, string>(songs.map((song) => [song.id, song.title]));
  return rounds.map((round) => ({
    roundId: round.id,
    openedAtLabel: round.openedAt.slice(TIME_LABEL_SLICE_START, TIME_LABEL_SLICE_END),
    winnerTitle: titleBySongId.get(round.winningSongId) ?? null,
  }));
}

export interface ParticipationView {
  readonly ballotCount: number;
  readonly capacity: number | null;
  readonly sharePercent: number | null;
}

// @FollowsBlueprint core-projection
export function selectParticipation(
  ballotCount: number,
  capacity: number | null,
): ParticipationView {
  const roomSize = capacity ?? NO_ROOM_COUNTED;
  if (roomSize <= NO_ROOM_COUNTED) return { ballotCount, capacity: null, sharePercent: null };
  return {
    ballotCount,
    capacity: roomSize,
    sharePercent: Math.round((ballotCount / roomSize) * PERCENT_SCALE),
  };
}
