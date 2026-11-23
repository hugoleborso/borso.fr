import { scoreEntry, selectTricksTaken } from '@domain/scoring.core';
import type { GameEntry, GamePlayer, GameRound, GameView } from './game-view.core';

export interface Standing {
  readonly player: GamePlayer;
  readonly total: number;
  readonly lastDelta: number | null;
}

const MINUS_SIGN = '−';

// @FollowsBlueprint domain-shared-selection
export function selectScoredRounds(game: GameView): readonly GameRound[] {
  const lastScored = game.phase === 'bidding' ? game.currentRound - 1 : game.currentRound;
  return game.rounds.filter((round) => round.number <= lastScored);
}

export function selectRound(game: GameView, roundNumber: number): GameRound | null {
  return game.rounds.find((round) => round.number === roundNumber) ?? null;
}

export function selectEntry(round: GameRound, playerId: string): GameEntry | null {
  return round.entries.find((entry) => entry.playerId === playerId) ?? null;
}

export function selectEntryPoints(round: GameRound, playerId: string): number | null {
  const entry = selectEntry(round, playerId);
  return entry === null ? null : scoreEntry(entry, round.cardCount);
}

export function selectStandings(game: GameView): readonly Standing[] {
  const scored = selectScoredRounds(game);
  const lastRound = scored.at(-1);
  return game.players
    .map((player) => ({
      player,
      total: scored.reduce((total, round) => total + (selectEntryPoints(round, player.id) ?? 0), 0),
      lastDelta: lastRound === undefined ? null : selectEntryPoints(lastRound, player.id),
    }))
    .toSorted(
      (first, second) => second.total - first.total || first.player.seat - second.player.seat,
    );
}

export function selectLeaderIds(standings: readonly Standing[]): readonly string[] {
  const best = standings[0]?.total;
  return standings
    .filter((standing) => standing.total === best)
    .map((standing) => standing.player.id);
}

export function sumBids(round: GameRound): number {
  return round.entries.reduce((total, entry) => total + (entry.bid ?? 0), 0);
}

export function formatSignedPoints(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `${MINUS_SIGN}${Math.abs(points)}`;
  return '0';
}

export type PointsTone = 'pending' | 'gain' | 'loss';

export function selectPointsTone(points: number | null): PointsTone {
  if (points === null) return 'pending';
  return points >= 0 ? 'gain' : 'loss';
}

export function formatPointsOrPending(points: number | null, pending: string): string {
  return points === null ? pending : formatSignedPoints(points);
}

export function selectBonusBadge(count: number, pointsEach: number): string | null {
  if (count === 0) return null;
  return count > 1 ? `${count}\u00d7${pointsEach}` : `+${pointsEach}`;
}

const NO_VALUE = '\u2013';

export function formatEntryDetail(entry: GameEntry | null): string {
  const bid = entry?.bid ?? null;
  const tricks = entry === null ? null : selectTricksTaken(entry);
  return `${bid === null ? NO_VALUE : String(bid)}/${tricks === null ? NO_VALUE : String(tricks)}`;
}

export function selectLatestEntry(
  game: GameView | undefined,
  roundNumber: number,
  playerId: string,
): GameEntry | null {
  const round = game === undefined ? null : selectRound(game, roundNumber);
  return round === null ? null : selectEntry(round, playerId);
}
