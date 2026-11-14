import { describe, expect, it } from 'vitest';
import {
  type BoardPointerState,
  buildBoardPointerState,
  followFen,
  listPromotionChoices,
  listSelectedTargets,
  PROMOTION_PIECES,
  selectCurrentPointerState,
  selectDragStartState,
  selectDropStep,
  selectPromotionStep,
  selectRightPressState,
  selectRightReleaseState,
  selectTapStep,
} from './board-interaction.utils';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const WHITE_PROMOTES = 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1';

function stateAt(fen: string, change: Partial<BoardPointerState> = {}): BoardPointerState {
  return { ...buildBoardPointerState(fen), ...change };
}

// @FollowsBlueprint test-pure-unit
describe('the pointer state of a board', () => {
  it('starts with nothing selected, pending or marked', () => {
    expect(buildBoardPointerState(START)).toEqual({
      fen: START,
      selectedSquare: null,
      pendingPromotion: null,
      markedSquares: [],
      rightPressSquare: null,
    });
  });

  it('keeps the selection while the position stays, and drops it once the position changes', () => {
    const selected = stateAt(START, { selectedSquare: 'e2', markedSquares: ['d4'] });
    expect(selectCurrentPointerState(selected, START)).toBe(selected);
    expect(selectCurrentPointerState(selected, AFTER_E4_D5)).toEqual(
      buildBoardPointerState(AFTER_E4_D5),
    );
  });

  it('lists the legal targets of the selected piece only', () => {
    expect(listSelectedTargets(stateAt(START))).toEqual([]);
    expect(listSelectedTargets(stateAt(START, { selectedSquare: 'b1' }))).toEqual([
      { square: 'a3', isCapture: false, isPromotion: false },
      { square: 'c3', isCapture: false, isPromotion: false },
    ]);
  });

  it('remembers the position before the current one', () => {
    const trail = { previousFen: null, fen: START };
    expect(followFen(trail, START)).toBe(trail);
    expect(followFen(trail, AFTER_E4_D5)).toEqual({ previousFen: START, fen: AFTER_E4_D5 });
  });
});

describe('a tap on the board', () => {
  it('selects a piece of the side that may move, and clears the marks', () => {
    const step = selectTapStep(
      stateAt(START, { markedSquares: ['d4'] }),
      { square: 'e2', pieceType: 'wP' },
      'white',
    );
    expect(step).toEqual({ state: stateAt(START, { selectedSquare: 'e2' }), move: null });
  });

  it('ignores a piece of the other side and an empty square when nothing is selected', () => {
    const cleared = { state: stateAt(START), move: null };
    expect(selectTapStep(stateAt(START), { square: 'e7', pieceType: 'bP' }, 'white')).toEqual(
      cleared,
    );
    expect(selectTapStep(stateAt(START), { square: 'e4', pieceType: null }, 'white')).toEqual(
      cleared,
    );
    expect(selectTapStep(stateAt(START), { square: 'e2', pieceType: 'wP' }, 'none')).toEqual(
      cleared,
    );
  });

  it('deselects the piece when it is tapped again', () => {
    const step = selectTapStep(
      stateAt(START, { selectedSquare: 'e2' }),
      { square: 'e2', pieceType: 'wP' },
      'white',
    );
    expect(step).toEqual({ state: stateAt(START), move: null });
  });

  it('plays the selected piece to a legal empty square', () => {
    const step = selectTapStep(
      stateAt(START, { selectedSquare: 'e2' }),
      { square: 'e4', pieceType: null },
      'white',
    );
    expect(step).toEqual({ state: stateAt(START), move: { uci: 'e2e4', isCapture: false } });
  });

  it('plays a capture on a piece of the other side', () => {
    const step = selectTapStep(
      stateAt(AFTER_E4_D5, { selectedSquare: 'e4' }),
      { square: 'd5', pieceType: 'bP' },
      'white',
    );
    expect(step.move).toEqual({ uci: 'e4d5', isCapture: true });
  });

  it('switches the selection to another piece of the same side', () => {
    const step = selectTapStep(
      stateAt(START, { selectedSquare: 'e2' }),
      { square: 'g1', pieceType: 'wN' },
      'white',
    );
    expect(step).toEqual({ state: stateAt(START, { selectedSquare: 'g1' }), move: null });
  });

  it('deselects on a square the selected piece cannot reach', () => {
    const step = selectTapStep(
      stateAt(START, { selectedSquare: 'e2' }),
      { square: 'e5', pieceType: null },
      'white',
    );
    expect(step).toEqual({ state: stateAt(START), move: null });
    expect(
      selectTapStep(
        stateAt(START, { selectedSquare: 'e2' }),
        { square: 'e7', pieceType: 'bP' },
        'white',
      ),
    ).toEqual({ state: stateAt(START), move: null });
  });

  it('asks for the promotion piece instead of playing a pawn onto the last rank', () => {
    const step = selectTapStep(
      stateAt(WHITE_PROMOTES, { selectedSquare: 'b7' }),
      { square: 'b8', pieceType: null },
      'white',
    );
    expect(step).toEqual({
      state: stateAt(WHITE_PROMOTES, {
        selectedSquare: 'b7',
        pendingPromotion: { fromSquare: 'b7', toSquare: 'b8' },
      }),
      move: null,
    });
  });
});

describe('a drag on the board', () => {
  it('selects the dragged piece so its targets show, and leaves a drag without a square alone', () => {
    const marked = stateAt(START, { markedSquares: ['d4'] });
    expect(selectDragStartState(marked, 'g1')).toEqual(stateAt(START, { selectedSquare: 'g1' }));
    expect(selectDragStartState(marked, null)).toBe(marked);
  });

  it('plays a drop on a legal square', () => {
    expect(selectDropStep(stateAt(START, { selectedSquare: 'g1' }), 'g1', 'f3')).toEqual({
      state: stateAt(START),
      move: { uci: 'g1f3', isCapture: false },
    });
  });

  it('keeps the piece selected when it is dropped back on its own square', () => {
    expect(selectDropStep(stateAt(START), 'g1', 'g1')).toEqual({
      state: stateAt(START, { selectedSquare: 'g1' }),
      move: null,
    });
  });

  it('returns the piece on an illegal square or off the board', () => {
    const cleared = { state: stateAt(START), move: null };
    expect(selectDropStep(stateAt(START, { selectedSquare: 'g1' }), 'g1', 'g3')).toEqual(cleared);
    expect(selectDropStep(stateAt(START, { selectedSquare: 'g1' }), 'g1', null)).toEqual(cleared);
  });

  it('asks for the promotion piece on a drop onto the last rank', () => {
    expect(selectDropStep(stateAt(WHITE_PROMOTES), 'b7', 'a8').state.pendingPromotion).toEqual({
      fromSquare: 'b7',
      toSquare: 'a8',
    });
  });
});

describe('the promotion choice', () => {
  it('plays the chosen piece, a capture when the pawn takes', () => {
    const pending = stateAt(WHITE_PROMOTES, {
      selectedSquare: 'b7',
      pendingPromotion: { fromSquare: 'b7', toSquare: 'a8' },
    });
    expect(selectPromotionStep(pending, 'n')).toEqual({
      state: stateAt(WHITE_PROMOTES),
      move: { uci: 'b7a8n', isCapture: true },
    });
    const straight = { ...pending, pendingPromotion: { fromSquare: 'b7', toSquare: 'b8' } };
    expect(selectPromotionStep(straight, 'q').move).toEqual({ uci: 'b7b8q', isCapture: false });
  });

  it('plays nothing when no promotion is pending', () => {
    expect(selectPromotionStep(stateAt(START, { selectedSquare: 'e2' }), 'q')).toEqual({
      state: stateAt(START),
      move: null,
    });
  });

  it('counts a promotion the position no longer allows as no capture', () => {
    const stale = stateAt(START, { pendingPromotion: { fromSquare: 'b7', toSquare: 'a8' } });
    expect(selectPromotionStep(stale, 'q').move).toEqual({ uci: 'b7a8q', isCapture: false });
  });

  it('offers the queen first, then the knight, the rook and the bishop', () => {
    expect(PROMOTION_PIECES).toEqual(['q', 'n', 'r', 'b']);
  });

  it('stacks the white choices down from the promotion square when White is at the bottom', () => {
    expect(listPromotionChoices({ fromSquare: 'b7', toSquare: 'a8' }, 'white')).toEqual([
      {
        piece: 'q',
        labelKey: 'board.promotion.queen',
        pieceType: 'wQ',
        leftPercent: 0,
        topPercent: 0,
      },
      {
        piece: 'n',
        labelKey: 'board.promotion.knight',
        pieceType: 'wN',
        leftPercent: 0,
        topPercent: 12.5,
      },
      {
        piece: 'r',
        labelKey: 'board.promotion.rook',
        pieceType: 'wR',
        leftPercent: 0,
        topPercent: 25,
      },
      {
        piece: 'b',
        labelKey: 'board.promotion.bishop',
        pieceType: 'wB',
        leftPercent: 0,
        topPercent: 37.5,
      },
    ]);
  });

  it('stacks the white choices up from the bottom edge when the board is turned for Black', () => {
    expect(
      listPromotionChoices({ fromSquare: 'b7', toSquare: 'b8' }, 'black').map((choice) => [
        choice.pieceType,
        choice.leftPercent,
        choice.topPercent,
      ]),
    ).toEqual([
      ['wQ', 75, 87.5],
      ['wN', 75, 75],
      ['wR', 75, 62.5],
      ['wB', 75, 50],
    ]);
  });

  it('places the black choices on the side of the first rank', () => {
    expect(
      listPromotionChoices({ fromSquare: 'g2', toSquare: 'g1' }, 'black').map((choice) => [
        choice.pieceType,
        choice.leftPercent,
        choice.topPercent,
      ]),
    ).toEqual([
      ['bQ', 12.5, 0],
      ['bN', 12.5, 12.5],
      ['bR', 12.5, 25],
      ['bB', 12.5, 37.5],
    ]);
    expect(
      listPromotionChoices({ fromSquare: 'g2', toSquare: 'h1' }, 'white').map((choice) => [
        choice.pieceType,
        choice.leftPercent,
        choice.topPercent,
      ]),
    ).toEqual([
      ['bQ', 87.5, 87.5],
      ['bN', 87.5, 75],
      ['bR', 87.5, 62.5],
      ['bB', 87.5, 50],
    ]);
  });

  it('offers nothing while no promotion is pending', () => {
    expect(listPromotionChoices(null, 'white')).toEqual([]);
  });
});

describe('a right click on the board', () => {
  it('marks the square it was pressed and released on, and drops the selection', () => {
    const pressed = selectRightPressState(stateAt(START, { selectedSquare: 'e2' }), 'd4');
    expect(pressed.rightPressSquare).toBe('d4');
    expect(selectRightReleaseState(pressed, 'd4')).toEqual(
      stateAt(START, { markedSquares: ['d4'] }),
    );
  });

  it('unmarks a marked square and keeps the others', () => {
    const pressed = stateAt(START, { markedSquares: ['d4', 'e5'], rightPressSquare: 'd4' });
    expect(selectRightReleaseState(pressed, 'd4').markedSquares).toEqual(['e5']);
  });

  it('marks nothing when the press ends on another square, as an arrow does', () => {
    const pressed = stateAt(START, {
      selectedSquare: 'e2',
      markedSquares: ['e5'],
      rightPressSquare: 'g8',
    });
    expect(selectRightReleaseState(pressed, 'f6')).toEqual({ ...pressed, rightPressSquare: null });
  });
});
