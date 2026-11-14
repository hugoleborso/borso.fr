import { describe, expect, it } from 'vitest';
import { isPieceMovable, selectMovableSide } from './board-gesture.utils';

const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';

// @FollowsBlueprint test-pure-unit
describe('selectMovableSide', () => {
  it('lets the side to move move when the board takes moves for both sides', () => {
    expect(selectMovableSide(WHITE_TO_MOVE, 'both')).toBe('white');
    expect(selectMovableSide(BLACK_TO_MOVE, 'both')).toBe('black');
  });

  it("lets the reader move only on the reader's turn", () => {
    expect(selectMovableSide(BLACK_TO_MOVE, 'black')).toBe('black');
    expect(selectMovableSide(WHITE_TO_MOVE, 'black')).toBe('none');
    expect(selectMovableSide(WHITE_TO_MOVE, 'white')).toBe('white');
    expect(selectMovableSide(BLACK_TO_MOVE, 'white')).toBe('none');
  });

  it('lets nobody move on a board that only shows a line', () => {
    expect(selectMovableSide(WHITE_TO_MOVE, 'none')).toBe('none');
  });

  it('reads white to move from a placement without a turn field', () => {
    expect(selectMovableSide('8/8/8/8/8/8/8/8', 'both')).toBe('white');
    expect(selectMovableSide('8/8/8/8/8/8/8/8 x', 'both')).toBe('white');
  });
});

describe('isPieceMovable', () => {
  it('moves only the pieces of the movable side', () => {
    expect(isPieceMovable('wN', 'white')).toBe(true);
    expect(isPieceMovable('bN', 'white')).toBe(false);
    expect(isPieceMovable('bQ', 'black')).toBe(true);
    expect(isPieceMovable('wQ', 'black')).toBe(false);
  });

  it('moves no piece when no side may move', () => {
    expect(isPieceMovable('wP', 'none')).toBe(false);
    expect(isPieceMovable('nP', 'none')).toBe(false);
  });
});
