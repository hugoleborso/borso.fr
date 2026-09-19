import { MINIMUM_BID_BANANAS } from '@domain/bid.core';
import { MINIMUM_SEATS } from '@domain/game-setup.core';
import { GAME_STATUSES, type GameStatus } from './games.schema';

export interface StandingPlayer {
  readonly playerId: string;
  readonly stash: number;
}

export type StartRefusal = 'not-in-lobby' | 'not-enough-players';
export type JoinRefusal = 'already-started' | 'game-full' | 'avatar-taken';

const NO_SEATS_LEFT = 0;

/**
 * @Blueprint core-decision-table-for-a-lifecycle
 * @BlueprintName Core Decision Table For A Lifecycle
 * @BlueprintUsage Use for the rules that say whether a state change is allowed, when the answer has to reach a screen as a named reason rather than a thrown error.
 * @BlueprintDescription Returns a named refusal or null instead of a boolean, so the caller has the reason without a second call and a translation key falls straight out of the union. Every function takes the facts it needs as plain arguments and never a record from the database, which is what keeps the file pure and lets the same rules answer for a row, for a draft the player has not saved, and for a test fixture written by hand. `null` means allowed, which reads the same way in every one of these functions.
 */
export function refuseStart(status: GameStatus, playerCount: number): StartRefusal | null {
  if (status !== 'lobby') return 'not-in-lobby';
  if (playerCount < MINIMUM_SEATS) return 'not-enough-players';
  return null;
}

export function refuseJoin(
  status: GameStatus,
  seatedCount: number,
  maxPlayers: number,
  takenAvatars: readonly string[],
  wantedAvatar: string,
): JoinRefusal | null {
  if (status !== 'lobby') return 'already-started';
  if (seatedCount >= maxPlayers) return 'game-full';
  if (takenAvatars.includes(wantedAvatar)) return 'avatar-taken';
  return null;
}

export function countFreeSeats(seatedCount: number, maxPlayers: number): number {
  return Math.max(maxPlayers - seatedCount, NO_SEATS_LEFT);
}

export function selectGameWinners(
  players: readonly StandingPlayer[],
  winningScore: number,
): readonly string[] {
  const reached = players.filter((player) => player.stash >= winningScore);
  const tallest = reached.reduce((best, player) => Math.max(best, player.stash), 0);
  return reached.filter((player) => player.stash === tallest).map((player) => player.playerId);
}

export function hasRoundTimerExpired(
  roundOpenedAt: Date | null,
  roundTimerSeconds: number | null,
  now: Date,
): boolean {
  if (roundOpenedAt === null) return false;
  if (roundTimerSeconds === null) return false;
  const millisecondsPerSecond = 1_000;
  const deadline = roundOpenedAt.getTime() + roundTimerSeconds * millisecondsPerSecond;
  return now.getTime() >= deadline;
}

export function narrowGameStatus(storedStatus: string): GameStatus {
  const known = GAME_STATUSES.find((candidate) => candidate === storedStatus);
  return known ?? 'lobby';
}

export interface SeatedBid {
  readonly playerId: string;
  readonly stashBefore: number;
  readonly bid: number;
}

export interface RosterEntry {
  readonly id: string;
  readonly stashBananas: number;
}

/**
 * @Blueprint core-table-assembled-from-a-roster-and-its-answers
 * @BlueprintName Core Table Assembled From A Roster And Its Answers
 * @BlueprintUsage Use where a rule needs one entry per participant and the answers arrive as a separate list that may be short.
 * @BlueprintDescription Answers `null` when somebody has not replied rather than filling the gap silently, so the caller decides between waiting and standing in a default, and the rule downstream never has to ask whether its input was complete. Joining through a map keyed by identifier rather than a nested search keeps the cost linear in the roster, and the order is the roster's, so the table a rule sees does not depend on the order the answers happened to arrive in.
 */
export function assembleBidTable(
  roster: readonly RosterEntry[],
  amountByPlayerId: ReadonlyMap<string, number>,
): readonly SeatedBid[] | null {
  const table: SeatedBid[] = [];
  for (const player of roster) {
    const amount = amountByPlayerId.get(player.id);
    if (amount === undefined) return null;
    table.push({ playerId: player.id, stashBefore: player.stashBananas, bid: amount });
  }
  return table;
}

export function selectMissingBidders(
  roster: readonly RosterEntry[],
  amountByPlayerId: ReadonlyMap<string, number>,
): readonly RosterEntry[] {
  return roster.filter((player) => !amountByPlayerId.has(player.id));
}

export const AUTOMATIC_BID_BANANAS = MINIMUM_BID_BANANAS;

export function selectWinnersWhenFinished(
  status: GameStatus,
  players: readonly StandingPlayer[],
  winningScore: number,
): readonly string[] {
  if (status !== 'finished') return [];
  return selectGameWinners(players, winningScore);
}
