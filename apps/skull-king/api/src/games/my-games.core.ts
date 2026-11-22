import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import { type RoundPhase, selectCardCount } from '@domain/round.core';
import { scoreEntry } from '@domain/scoring.core';
import { type EntryFacts, readBidAdjustment, readBonuses, readRascalBet } from './game-view.core';

export interface MyGamePlayerFacts {
  readonly id: string;
  readonly seat: number;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly accountId: string | null;
}

export interface MyGameFacts {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly openedAt: Date;
  readonly players: readonly MyGamePlayerFacts[];
  readonly entries: readonly EntryFacts[];
}

export interface MyGamePlayerView {
  readonly seat: number;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly accountId: string | null;
}

export interface MyGameView {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly openedAt: string;
  readonly players: readonly MyGamePlayerView[];
  readonly myRank: number | null;
  readonly winnerSeats: readonly number[];
}

const NO_POINTS = 0;
const FIRST_RANK = 1;

function sumPoints(game: MyGameFacts, playerId: string): number {
  return game.entries
    .filter((entry) => entry.playerId === playerId && entry.roundNumber <= game.currentRound)
    .reduce((total, entry) => {
      const cardCount = selectCardCount(entry.roundNumber, game.players.length);
      const points = scoreEntry(
        {
          bid: entry.bid,
          bidAdjustment: readBidAdjustment(entry.bidAdjustment),
          rascalBet: readRascalBet(entry.rascalBet),
          tricks: entry.tricks,
          bonuses: readBonuses(entry),
        },
        cardCount,
      );
      return total + (points ?? NO_POINTS);
    }, NO_POINTS);
}

export function selectMyRank(game: MyGameFacts, accountId: string): number | null {
  const mine = game.players.find((player) => player.accountId === accountId);
  if (mine === undefined) return null;
  const myTotal = sumPoints(game, mine.id);
  const ahead = game.players.filter((player) => sumPoints(game, player.id) > myTotal);
  return FIRST_RANK + ahead.length;
}

export function selectWinnerSeats(game: MyGameFacts): readonly number[] {
  if (game.phase !== 'finished' || game.players.length === 0) return [];
  const totals = game.players.map((player) => ({
    seat: player.seat,
    total: sumPoints(game, player.id),
  }));
  const best = Math.max(...totals.map((standing) => standing.total));
  return totals
    .filter((standing) => standing.total === best)
    .map((standing) => standing.seat)
    .toSorted((first, second) => first - second);
}

// @FollowsBlueprint core-projection
export function buildMyGames(games: readonly MyGameFacts[], accountId: string): MyGameView[] {
  return games.map((game) => ({
    joinCode: game.joinCode,
    phase: game.phase,
    currentRound: game.currentRound,
    openedAt: game.openedAt.toISOString(),
    players: game.players
      .toSorted((first, second) => first.seat - second.seat)
      .map(({ seat, icon, color, accountId: seatAccountId }) => ({
        seat,
        icon,
        color,
        accountId: seatAccountId,
      })),
    myRank: selectMyRank(game, accountId),
    winnerSeats: selectWinnerSeats(game),
  }));
}
