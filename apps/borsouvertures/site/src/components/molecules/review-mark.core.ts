import type { BoardMark } from '@/components/atoms/board-mark.utils';
import { uciToSquare } from '@/openings/uciSquare.utils';
import type { ReviewStatus } from '@/review/review-machine.utils';
import type { Side } from '@/state/persistedState.utils';

const TOP_RIGHT_SQUARE_BY_SIDE = {
  white: 'h8',
  black: 'a1',
} as const satisfies Record<Side, string>;

// @FollowsBlueprint utils-pure-module
export function selectReviewMark(
  status: ReviewStatus,
  answerMoves: readonly string[],
  readerSide: Side,
): BoardMark | null {
  if (status === 'recalled') return { tone: 'recalled', square: null };
  if (status !== 'missed') return null;
  const lastAnswerMove = answerMoves.at(-1);
  return {
    tone: 'missed',
    square:
      lastAnswerMove === undefined
        ? TOP_RIGHT_SQUARE_BY_SIDE[readerSide]
        : uciToSquare(lastAnswerMove),
  };
}
