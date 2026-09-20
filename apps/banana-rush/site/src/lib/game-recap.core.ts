import type { BroadcastPlayer, BroadcastRound } from './game-broadcast.core';
import { buildStoriesForRound, type RoundStory } from './game-summary.core';

export interface RecapRound {
  readonly roundNumber: number;
  readonly crateBefore: number;
  readonly crateAfter: number;
  readonly stories: readonly RoundStory[];
}

const FIRST_PAGE = 0;
const ONE_PAGE = 1;

/**
 * @Blueprint core-history-paged-rather-than-listed
 * @BlueprintName Core History Paged Rather Than Listed
 * @BlueprintUsage Use where a record grows with every step a game takes and the screen reading it is not allowed to scroll.
 * @BlueprintDescription Turns the whole history into one page per step, each already joined with the roster, so the screen renders a single page and its height is bounded by the largest table the rules allow rather than by how long the game ran. The join is the one the live reveal already uses, which is what keeps a round told the same way whether it is read as it happens or read back afterwards. A round naming somebody who is no longer at the table simply tells fewer stories, so nothing here fails on a roster that has moved on.
 */
export function buildRecapRounds(
  rounds: readonly BroadcastRound[],
  players: readonly BroadcastPlayer[],
): readonly RecapRound[] {
  return rounds.map((round) => ({
    roundNumber: round.roundNumber,
    crateBefore: round.crateBefore,
    crateAfter: round.crateAfter,
    stories: buildStoriesForRound(round, players),
  }));
}

/**
 * @Blueprint core-page-index-held-inside-its-range
 * @BlueprintName Core Page Index Held Inside Its Range
 * @BlueprintUsage Use for the position of a reader inside a list whose length is not known when the position is stored.
 * @BlueprintDescription Answers a position that is always readable, by squeezing the wanted one between the first page and the last, with no branch of its own. Written as two clamps rather than as a pair of comparisons, it cannot carry a condition whose boundary is a matter of taste and is therefore impossible to test from the outside, and an empty history answers the first page rather than a negative index that would read as a page from the end of the list.
 */
export function clampPageIndex(wantedIndex: number, pageCount: number): number {
  return Math.min(Math.max(wantedIndex, FIRST_PAGE), Math.max(pageCount - ONE_PAGE, FIRST_PAGE));
}

export function selectPage(
  pages: readonly RecapRound[],
  pageIndex: number,
): RecapRound | undefined {
  return pages[clampPageIndex(pageIndex, pages.length)];
}

export function isPreviousStepBlocked(pageIndex: number): boolean {
  return pageIndex <= FIRST_PAGE;
}

export function isNextStepBlocked(pageIndex: number, pageCount: number): boolean {
  return pageIndex >= pageCount - ONE_PAGE;
}
