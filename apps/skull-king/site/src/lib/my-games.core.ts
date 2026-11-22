import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import type { RoundPhase } from '@domain/round.core';
import type { GamePlayer, GameView } from './game-view.core';

export interface MyGame {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly openedAt: string;
  readonly players: readonly {
    readonly seat: number;
    readonly icon: PlayerIcon;
    readonly color: PlayerColor;
    readonly accountId: string | null;
  }[];
  readonly myRank: number | null;
  readonly winnerSeats: readonly number[];
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

// @FollowsBlueprint utils-pure-module
export function sortNewestFirst(games: readonly MyGame[]): readonly MyGame[] {
  return games.toSorted(
    (first, second) => Date.parse(second.openedAt) - Date.parse(first.openedAt),
  );
}

export function formatGameDate(isoInstant: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(isoInstant));
}

export function canClaimSeat(game: GameView, accountId: string | null): boolean {
  if (accountId === null) return false;
  return !game.players.some((player) => player.accountId === accountId);
}

export function isMySeat(player: GamePlayer, accountId: string | null): boolean {
  return accountId !== null && player.accountId === accountId;
}

export function isGameFinished(game: MyGame): boolean {
  return game.phase === 'finished';
}

export function selectWinners(game: MyGame): MyGame['players'] {
  return game.players.filter((player) => game.winnerSeats.includes(player.seat));
}
