import { shortLineName } from './lineDisplay.utils';
import type { Line, Opening, Variation } from './types';

export interface BookPosition {
  opening: Opening | undefined;
  variation: Variation | undefined;
  line: Line | undefined;
}

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

export function isUndoAllowed(playedMoveCount: number, isAutoOpponentEnabled: boolean): boolean {
  const requiredMoves = isAutoOpponentEnabled ? MOVES_PER_FULL_TURN : MOVES_PER_HALF_TURN;
  return playedMoveCount >= requiredMoves;
}
