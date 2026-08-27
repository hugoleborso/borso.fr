/** @Feature audience-voting */

import { formatClockTime } from '../../lib/formatters.utils';

const VOTE_PATH_PREFIX = '/vote/';
const SHORT_VOTE_PATH = '/vote';
const PERCENT_SCALE = 100;
const NO_ROOM_COUNTED = 0;

export interface RoundHistoryRow {
  readonly id: string;
  readonly openedAt: string;
  readonly winningSongId: string | null;
  readonly winningSongTitle: string | null;
}

export type RoundOutcome =
  | { readonly kind: 'blank' }
  | { readonly kind: 'won'; readonly title: string }
  | { readonly kind: 'won-unnamed' };

export interface RoundHistoryLine {
  readonly roundId: string;
  readonly openedAtLabel: string;
  readonly outcome: RoundOutcome;
}

export function buildVoteAddress(origin: string, sessionId: string): string {
  return `${origin}${VOTE_PATH_PREFIX}${sessionId}`;
}

export function buildShortVoteAddress(origin: string): string {
  return `${new URL(origin).host}${SHORT_VOTE_PATH}`;
}

// @FollowsBlueprint core-decision
export function selectRoundOutcome(round: RoundHistoryRow): RoundOutcome {
  if (round.winningSongId === null) return { kind: 'blank' };
  if (round.winningSongTitle === null) return { kind: 'won-unnamed' };
  return { kind: 'won', title: round.winningSongTitle };
}

// @FollowsBlueprint core-projection
export function selectRoundHistoryLines(
  rounds: readonly RoundHistoryRow[],
  locale: string,
): RoundHistoryLine[] {
  return rounds.map((round) => ({
    roundId: round.id,
    openedAtLabel: formatClockTime(round.openedAt, locale),
    outcome: selectRoundOutcome(round),
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
