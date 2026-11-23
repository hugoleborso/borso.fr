import { selectFinalBid, selectTricksTaken } from '@domain/scoring.core';
import type { StepDirection, StepView } from './ability-stepper.core';
import type { EntryEdit } from './game-edits.core';
import type { GameEntry } from './game-view.core';
import { selectTricksCorrection } from './round-results.core';

const LOWEST_COUNT = 0;
const FIRST_BID_UP = LOWEST_COUNT + 1;
const MINUS_SIGN = '−';
const PLUS_SIGN = '+';
const NO_COUNT = '–';

// @FollowsBlueprint utils-pure-module
function stepFrom(
  start: number | null,
  direction: StepDirection,
  highest: number,
  skipped: number | null,
): number | null {
  if (start === null) return null;
  const next = start + direction;
  const landed = next === skipped ? next + direction : next;
  return landed >= LOWEST_COUNT && landed <= highest ? landed : null;
}

export function stepBid(
  bid: number | null,
  direction: StepDirection,
  cardCount: number,
): number | null {
  if (bid === null) return direction === -1 ? LOWEST_COUNT : FIRST_BID_UP;
  return stepFrom(bid, direction, cardCount, null);
}

export function stepMissedTricks(
  entry: GameEntry,
  direction: StepDirection,
  cardCount: number,
): number | null {
  const finalBid = selectFinalBid(entry);
  return stepFrom(entry.tricks ?? finalBid, direction, cardCount, finalBid);
}

export function stepTricksTaken(
  entry: GameEntry,
  direction: StepDirection,
  cardCount: number,
): number | null {
  return stepFrom(selectTricksTaken(entry) ?? selectFinalBid(entry), direction, cardCount, null);
}

export function selectCountSteps(
  stepTo: (direction: StepDirection) => number | null,
): readonly StepView[] {
  return [
    {
      direction: -1,
      text: MINUS_SIGN,
      labelKey: 'stepper.less',
      isDisabled: stepTo(-1) === null,
      isPressed: undefined,
    },
    {
      direction: 1,
      text: PLUS_SIGN,
      labelKey: 'stepper.more',
      isDisabled: stepTo(1) === null,
      isPressed: undefined,
    },
  ];
}

export function formatCount(count: number | null): string {
  return count === null ? NO_COUNT : String(count);
}

export function selectBidStepEdit(
  bid: number | null,
  direction: StepDirection,
  cardCount: number,
): EntryEdit {
  return { bid: stepBid(bid, direction, cardCount) ?? bid };
}

export function selectMissedTricksStepEdit(
  entry: GameEntry,
  direction: StepDirection,
  cardCount: number,
): EntryEdit {
  return { isMissed: true, tricks: stepMissedTricks(entry, direction, cardCount) ?? entry.tricks };
}

export function selectTricksTakenStepEdit(
  entry: GameEntry,
  direction: StepDirection,
  cardCount: number,
): EntryEdit {
  const taken = stepTricksTaken(entry, direction, cardCount);
  return taken === null ? {} : selectTricksCorrection(taken, selectFinalBid(entry));
}
