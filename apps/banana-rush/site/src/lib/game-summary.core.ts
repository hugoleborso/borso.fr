import type { BroadcastGame, BroadcastPlayer, BroadcastRound } from './game-broadcast.core';

export interface RoundStory {
  readonly playerId: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly bid: number;
  readonly stashBefore: number;
  readonly stashAfter: number;
  readonly crateWon: number;
  readonly tariffPaid: number;
  readonly tariffReceived: number;
  readonly busted: boolean;
  readonly wonTheCrate: boolean;
}

const NOTHING = 0;

/**
 * @Blueprint core-view-projection-joining-two-lists
 * @BlueprintName Core View Projection Joining Two Lists
 * @BlueprintUsage Use where a screen needs one row per person built from a result list and a roster that name the same people by identifier.
 * @BlueprintDescription Joins the two through a map keyed by identifier rather than a nested search, so the cost does not grow with the square of the table, and drops a result whose person is not on the roster instead of rendering a row with an empty name. The ordering is taken from the result list rather than from the roster, because the story a reveal tells is ordered by what happened and not by where people are sitting.
 */
export function buildStoriesForRound(
  round: BroadcastRound | null,
  players: readonly BroadcastPlayer[],
): readonly RoundStory[] {
  if (round === null) return [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  return round.outcomes.flatMap((outcome) => {
    const player = playerById.get(outcome.playerId);
    if (player === undefined) return [];
    return [
      {
        playerId: outcome.playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        bid: outcome.bid,
        stashBefore: outcome.stashBefore,
        stashAfter: outcome.stashAfter,
        crateWon: outcome.crateWon,
        tariffPaid: outcome.tariffPaid,
        tariffReceived: outcome.tariffReceived,
        busted: outcome.busted,
        wonTheCrate: outcome.crateWon > NOTHING,
      },
    ];
  });
}

export function buildRoundStories(game: BroadcastGame): readonly RoundStory[] {
  return buildStoriesForRound(game.lastRound, game.players);
}

export function sortByStashDescending(players: BroadcastGame['players']): BroadcastGame['players'] {
  return players.toSorted((left, right) => right.stashBananas - left.stashBananas);
}

export function haveAllPlayersBid(game: BroadcastGame): boolean {
  return game.players.length > 0 && game.players.every((player) => player.hasBid);
}

export function hasPaidATariff(story: RoundStory): boolean {
  return story.tariffPaid > NOTHING;
}

export function hasReceivedATariff(story: RoundStory): boolean {
  return story.tariffReceived > NOTHING;
}

export function readStashDelta(story: RoundStory): number {
  return story.stashAfter - story.stashBefore;
}

export function selectStoryTone(isBusted: boolean, isYou: boolean): string {
  if (isBusted) return 'bg-coral-soft';
  return isYou ? 'bg-peel-soft' : 'bg-cream';
}

export const NO_FREE_SEATS = 0;
