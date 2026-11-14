import type { Side } from '@/state/persistedState.utils';
import { isPieceMovable, type MovableSide } from './board-gesture.utils';
import { type BoardTarget, listLegalTargets } from './board-moves.utils';

export type PromotionPiece = 'q' | 'n' | 'r' | 'b';

export interface PendingPromotion {
  fromSquare: string;
  toSquare: string;
}

export interface BoardPointerState {
  fen: string;
  selectedSquare: string | null;
  pendingPromotion: PendingPromotion | null;
  markedSquares: readonly string[];
  rightPressSquare: string | null;
}

export interface BoardMoveRequest {
  uci: string;
  isCapture: boolean;
}

export interface BoardPointerStep {
  state: BoardPointerState;
  move: BoardMoveRequest | null;
}

export interface BoardTap {
  square: string;
  pieceType: string | null;
}

const PROMOTION_LABEL_KEY_BY_PIECE = {
  q: 'board.promotion.queen',
  n: 'board.promotion.knight',
  r: 'board.promotion.rook',
  b: 'board.promotion.bishop',
} as const satisfies Record<PromotionPiece, string>;

export interface PromotionChoice {
  piece: PromotionPiece;
  labelKey: (typeof PROMOTION_LABEL_KEY_BY_PIECE)[PromotionPiece];
  pieceType: string;
  leftPercent: number;
  topPercent: number;
}

export interface FenTrail {
  previousFen: string | null;
  fen: string;
}

export const PROMOTION_PIECES: readonly PromotionPiece[] = ['q', 'n', 'r', 'b'];

const NO_SQUARE = '';
const FILES = 'abcdefgh';
const SQUARES_PER_SIDE = 8;
const FULL_BOARD_PERCENT = 100;
const SQUARE_PERCENT = FULL_BOARD_PERCENT / SQUARES_PER_SIDE;
const WHITE_PROMOTION_RANK = '8';
const PROMOTION_PIECE_LETTER: Record<PromotionPiece, string> = {
  q: 'Q',
  n: 'N',
  r: 'R',
  b: 'B',
};

// @FollowsBlueprint utils-pure-module
export function buildBoardPointerState(fen: string): BoardPointerState {
  return {
    fen,
    selectedSquare: null,
    pendingPromotion: null,
    markedSquares: [],
    rightPressSquare: null,
  };
}

export function selectCurrentPointerState(
  state: BoardPointerState,
  fen: string,
): BoardPointerState {
  return state.fen === fen ? state : buildBoardPointerState(fen);
}

export function listSelectedTargets(state: BoardPointerState): BoardTarget[] {
  return state.selectedSquare === null ? [] : listLegalTargets(state.fen, state.selectedSquare);
}

function stay(state: BoardPointerState): BoardPointerStep {
  return { state, move: null };
}

function select(state: BoardPointerState, square: string): BoardPointerStep {
  return stay({ ...state, selectedSquare: square, markedSquares: [] });
}

function clear(state: BoardPointerState): BoardPointerStep {
  return stay(buildBoardPointerState(state.fen));
}

function moveTo(
  state: BoardPointerState,
  fromSquare: string,
  toSquare: string,
): BoardPointerStep | null {
  const target = listLegalTargets(state.fen, fromSquare).find((legal) => legal.square === toSquare);
  if (target === undefined) return null;
  if (target.isPromotion) {
    return stay({
      ...buildBoardPointerState(state.fen),
      selectedSquare: fromSquare,
      pendingPromotion: { fromSquare, toSquare },
    });
  }
  return {
    state: buildBoardPointerState(state.fen),
    move: { uci: `${fromSquare}${toSquare}`, isCapture: target.isCapture },
  };
}

export function selectTapStep(
  state: BoardPointerState,
  tap: BoardTap,
  movableSide: MovableSide,
): BoardPointerStep {
  const isOwnPiece = tap.pieceType !== null && isPieceMovable(tap.pieceType, movableSide);
  if (state.selectedSquare === tap.square) return clear(state);
  const step = moveTo(state, state.selectedSquare ?? NO_SQUARE, tap.square);
  if (step !== null) return step;
  return isOwnPiece ? select(state, tap.square) : clear(state);
}

export function selectDragStartState(
  state: BoardPointerState,
  square: string | null,
): BoardPointerState {
  return square === null ? state : select(state, square).state;
}

export function followFen(trail: FenTrail, fen: string): FenTrail {
  return trail.fen === fen ? trail : { previousFen: trail.fen, fen };
}

export function selectDropStep(
  state: BoardPointerState,
  fromSquare: string,
  toSquare: string | null,
): BoardPointerStep {
  if (toSquare === fromSquare) return select(state, fromSquare);
  return moveTo(state, fromSquare, toSquare ?? NO_SQUARE) ?? clear(state);
}

export function selectPromotionStep(
  state: BoardPointerState,
  piece: PromotionPiece,
): BoardPointerStep {
  const { pendingPromotion } = state;
  if (pendingPromotion === null) return clear(state);
  const target = listLegalTargets(state.fen, pendingPromotion.fromSquare).find(
    (legal) => legal.square === pendingPromotion.toSquare,
  );
  return {
    state: buildBoardPointerState(state.fen),
    move: {
      uci: `${pendingPromotion.fromSquare}${pendingPromotion.toSquare}${piece}`,
      isCapture: target?.isCapture === true,
    },
  };
}

export function selectRightPressState(state: BoardPointerState, square: string): BoardPointerState {
  return { ...state, rightPressSquare: square };
}

export function selectRightReleaseState(
  state: BoardPointerState,
  square: string,
): BoardPointerState {
  if (state.rightPressSquare !== square) return { ...state, rightPressSquare: null };
  const isMarked = state.markedSquares.includes(square);
  const markedSquares = isMarked
    ? state.markedSquares.filter((marked) => marked !== square)
    : [...state.markedSquares, square];
  return { ...state, selectedSquare: null, markedSquares, rightPressSquare: null };
}

export function listPromotionChoices(
  pendingPromotion: PendingPromotion | null,
  orientation: Side,
): PromotionChoice[] {
  if (pendingPromotion === null) return [];
  const { toSquare } = pendingPromotion;
  const fileIndex = FILES.indexOf(toSquare.charAt(0));
  const column = orientation === 'white' ? fileIndex : SQUARES_PER_SIDE - 1 - fileIndex;
  const isWhitePromoting = toSquare.charAt(1) === WHITE_PROMOTION_RANK;
  const colourLetter = isWhitePromoting ? 'w' : 'b';
  const isPromotionSquareOnTop = isWhitePromoting === (orientation === 'white');
  return PROMOTION_PIECES.map((piece, index) => ({
    piece,
    labelKey: PROMOTION_LABEL_KEY_BY_PIECE[piece],
    pieceType: `${colourLetter}${PROMOTION_PIECE_LETTER[piece]}`,
    leftPercent: column * SQUARE_PERCENT,
    topPercent: isPromotionSquareOnTop
      ? index * SQUARE_PERCENT
      : (SQUARES_PER_SIDE - 1 - index) * SQUARE_PERCENT,
  }));
}
