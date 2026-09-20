import { STARTING_STASH_BANANAS } from '@domain/game-setup.core';
import type { GameStatus } from './games.schema';

export type RematchRefusal = 'not-finished' | 'not-host';

export interface SeatedFacts {
  readonly nickname: string;
  readonly avatar: string;
  readonly seatOrder: number;
  readonly isHost: boolean;
}

export interface RematchSeat {
  readonly nickname: string;
  readonly avatar: string;
  readonly seatOrder: number;
  readonly isHost: boolean;
  readonly stashBananas: number;
}

export interface ClaimableSeat {
  readonly id: string;
  readonly avatar: string;
}

// @FollowsBlueprint core-decision-table-for-a-lifecycle
export function refuseRematch(status: GameStatus, isHost: boolean): RematchRefusal | null {
  if (status !== 'finished') return 'not-finished';
  if (!isHost) return 'not-host';
  return null;
}

/**
 * @Blueprint core-next-round-of-the-same-group
 * @BlueprintName Core Seating The Same Group At A New Table
 * @BlueprintUsage Use where a finished record has to be replayed by the same people without the finished one being touched.
 * @BlueprintDescription Describes the new seats as plain values rather than editing the old rows, which is what leaves the finished game readable at its own address while the group plays again. Every seat keeps the name, the monkey and the place at the table, because those are what make a phone recognise its own seat afterwards, and the stash goes back to the opening figure, because carrying a score forward would start the rematch already won. No credential is produced here: the caller mints one per seat, so nothing secret can be derived from a value this function returned.
 */
export function buildRematchSeats(players: readonly SeatedFacts[]): readonly RematchSeat[] {
  return players.map((player) => ({
    nickname: player.nickname,
    avatar: player.avatar,
    seatOrder: player.seatOrder,
    isHost: player.isHost,
    stashBananas: STARTING_STASH_BANANAS,
  }));
}

/**
 * @Blueprint core-seat-recognised-by-what-is-public
 * @BlueprintName Core Seat Recognised By What Is Public
 * @BlueprintUsage Use where a holder of one credential has to be matched to a row that was created for them before they asked for it.
 * @BlueprintDescription Matches on the monkey rather than on an identifier copied between the two tables, because the monkey is unique within a game by the rule that refuses a taken one, and it is already carried over to the new seats. That keeps the link between the two games out of the database entirely: nothing has to be stored that says which new row belongs to which old player, so nothing about the pairing can go stale or be written wrong. Answering `null` rather than throwing lets the caller decide which refusal the reader sees.
 */
export function selectSeatForAvatar(
  seats: readonly ClaimableSeat[],
  avatar: string,
): string | null {
  return seats.find((seat) => seat.avatar === avatar)?.id ?? null;
}
