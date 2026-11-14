import { describe, expect, it } from 'vitest';
import { listCheckedKingSquares, findPlayedSquares, listLegalTargets } from './board-moves.utils';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const PROMOTION_WITH_CAPTURE = 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1';
const EN_PASSANT = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
const WHITE_IN_CHECK = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const BLACK_IN_CHECK = 'rnbqkbnr/ppppp2p/5p2/6pQ/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 3';
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1';

// @FollowsBlueprint test-pure-unit
describe('listLegalTargets', () => {
  it('lists the empty squares a piece can reach', () => {
    expect(listLegalTargets(START, 'g1')).toEqual([
      { square: 'f3', isCapture: false, isPromotion: false },
      { square: 'h3', isCapture: false, isPromotion: false },
    ]);
  });

  it('flags a capture, an en passant capture included', () => {
    expect(listLegalTargets(AFTER_E4_D5, 'e4')).toEqual([
      { square: 'e5', isCapture: false, isPromotion: false },
      { square: 'd5', isCapture: true, isPromotion: false },
    ]);
    expect(listLegalTargets(EN_PASSANT, 'e5')).toContainEqual({
      square: 'f6',
      isCapture: true,
      isPromotion: false,
    });
  });

  it('lists a promotion square once, with or without a capture', () => {
    expect(listLegalTargets(PROMOTION_WITH_CAPTURE, 'b7')).toEqual([
      { square: 'b8', isCapture: false, isPromotion: true },
      { square: 'a8', isCapture: true, isPromotion: true },
    ]);
  });

  it('lists nothing for a piece of the side not to move, an empty square or a board without kings', () => {
    expect(listLegalTargets(START, 'g8')).toEqual([]);
    expect(listLegalTargets(START, 'e4')).toEqual([]);
    expect(listLegalTargets(EMPTY_BOARD, 'a1')).toEqual([]);
  });
});

describe('listCheckedKingSquares', () => {
  it('finds the king of the side to move when it stands in check', () => {
    expect(listCheckedKingSquares(WHITE_IN_CHECK)).toEqual(['e1']);
    expect(listCheckedKingSquares(BLACK_IN_CHECK)).toEqual(['e8']);
  });

  it('finds none when no king is in check, or on a board without kings', () => {
    expect(listCheckedKingSquares(START)).toEqual([]);
    expect(listCheckedKingSquares(EMPTY_BOARD)).toEqual([]);
  });
});

describe('findPlayedSquares', () => {
  it('finds the move that leads from one position to the next', () => {
    expect(findPlayedSquares(START, AFTER_E4)).toEqual({ fromSquare: 'e2', toSquare: 'e4' });
    expect(findPlayedSquares(AFTER_E4, AFTER_E4_D5)).toEqual({ fromSquare: 'd7', toSquare: 'd5' });
  });

  it('ignores the move counters when it compares the positions', () => {
    expect(findPlayedSquares(START, AFTER_E4.replace('0 1', '7 9'))).toEqual({
      fromSquare: 'e2',
      toSquare: 'e4',
    });
  });

  it('finds none for the first position, a jump of several moves, a move back or the same position', () => {
    expect(findPlayedSquares(null, START)).toBeNull();
    expect(findPlayedSquares(START, AFTER_E4_D5)).toBeNull();
    expect(findPlayedSquares(AFTER_E4, START)).toBeNull();
    expect(findPlayedSquares(START, START)).toBeNull();
    expect(findPlayedSquares(EMPTY_BOARD, START)).toBeNull();
  });

  it('tells apart two positions with the same pieces and a different side to move', () => {
    expect(findPlayedSquares(START, START.replace(' w ', ' b '))).toBeNull();
  });
});
