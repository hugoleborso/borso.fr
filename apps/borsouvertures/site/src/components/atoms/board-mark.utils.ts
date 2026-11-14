import type { Side } from '@/state/persistedState.utils';

export type BoardMarkTone = 'recalled' | 'missed';

export interface BoardMark {
  tone: BoardMarkTone;
  square: string | null;
}

export interface BoardMarkBox {
  leftPercent: number;
  topPercent: number;
  sizePercent: number;
}

const FILES = 'abcdefgh';
const SQUARES_PER_SIDE = 8;
const FULL_BOARD_PERCENT = 100;
const SQUARE_PERCENT = FULL_BOARD_PERCENT / SQUARES_PER_SIDE;
const CENTRED_MARK_SIZE_PERCENT = 28;
const SQUARE_MARK_SIZE_PERCENT = 7.5;
const HALF = 2;

const CENTRED_MARK_OFFSET_PERCENT = (FULL_BOARD_PERCENT - CENTRED_MARK_SIZE_PERCENT) / HALF;

// @FollowsBlueprint component-lookup-table
const COLUMN_BY_ORIENTATION = {
  white: (fileIndex) => fileIndex,
  black: (fileIndex) => SQUARES_PER_SIDE - 1 - fileIndex,
} as const satisfies Record<Side, (fileIndex: number) => number>;

const ROW_BY_ORIENTATION = {
  white: (rank) => SQUARES_PER_SIDE - rank,
  black: (rank) => rank - 1,
} as const satisfies Record<Side, (rank: number) => number>;

function keepOnBoard(percent: number): number {
  return Math.min(Math.max(percent, 0), FULL_BOARD_PERCENT - SQUARE_MARK_SIZE_PERCENT);
}

// @FollowsBlueprint utils-pure-module
export function placeBoardMark(square: string | null, orientation: Side): BoardMarkBox {
  if (square === null) {
    return {
      leftPercent: CENTRED_MARK_OFFSET_PERCENT,
      topPercent: CENTRED_MARK_OFFSET_PERCENT,
      sizePercent: CENTRED_MARK_SIZE_PERCENT,
    };
  }
  const column = COLUMN_BY_ORIENTATION[orientation](FILES.indexOf(square.charAt(0)));
  const row = ROW_BY_ORIENTATION[orientation](Number(square.charAt(1)));
  const cornerLeftPercent = (column + 1) * SQUARE_PERCENT;
  const cornerTopPercent = row * SQUARE_PERCENT;
  return {
    leftPercent: keepOnBoard(cornerLeftPercent - SQUARE_MARK_SIZE_PERCENT / HALF),
    topPercent: keepOnBoard(cornerTopPercent - SQUARE_MARK_SIZE_PERCENT / HALF),
    sizePercent: SQUARE_MARK_SIZE_PERCENT,
  };
}
