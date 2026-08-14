import { shortLineName } from './lineDisplay.utils';
import type { Line, Opening, Variation } from './types';

/** The identified opening, variation and line of the position on the board. */
export interface BookPosition {
  opening: Opening | undefined;
  variation: Variation | undefined;
  line: Line | undefined;
}

/**
 * The line's distinctive suffix, e.g. `Greco's Attack` rather than the full
 * `Italian Game: Classical Variation, Greco's Attack`, and `undefined` while
 * the played moves still match several lines.
 */
// @FollowsBlueprint core-view-intent
export function selectLineLabel(position: BookPosition): string | undefined {
  const { opening, variation, line } = position;
  if (opening === undefined || variation === undefined || line === undefined) return undefined;
  return shortLineName(opening, variation, line) ?? variation.name;
}

export type CompletionMessageKey = 'play.completed.named' | 'play.completed.generic';

export function selectCompletionMessageKey(lineLabel: string | undefined): CompletionMessageKey {
  if (lineLabel === undefined) return 'play.completed.generic';
  return 'play.completed.named';
}

const MOVES_PER_FULL_TURN = 2;
const MOVES_PER_HALF_TURN = 1;

/** Undoing has to take back the opponent's reply too when it plays itself. */
export function isUndoAllowed(playedMoveCount: number, isAutoOpponentEnabled: boolean): boolean {
  const requiredMoves = isAutoOpponentEnabled ? MOVES_PER_FULL_TURN : MOVES_PER_HALF_TURN;
  return playedMoveCount >= requiredMoves;
}
