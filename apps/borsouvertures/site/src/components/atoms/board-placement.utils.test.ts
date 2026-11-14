import { describe, expect, it } from 'vitest';
import { readBoardPlacement } from './board-placement.utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

// @FollowsBlueprint test-pure-unit
describe('readBoardPlacement', () => {
  it('lists the 64 squares from a8 to h1 when White sits at the bottom', () => {
    const squares = readBoardPlacement(STARTING_FEN, 'white');
    expect(squares).toHaveLength(64);
    expect(squares[0]).toEqual({ square: 'a8', isDark: false, piece: 'bR' });
    expect(squares[3]).toEqual({ square: 'd8', isDark: true, piece: 'bQ' });
    expect(squares[63]).toEqual({ square: 'h1', isDark: false, piece: 'wR' });
  });

  it('colours a1 dark and h1 light, as on every board', () => {
    const squares = readBoardPlacement(STARTING_FEN, 'white');
    expect(squares.find((placed) => placed.square === 'a1')?.isDark).toBe(true);
    expect(squares.find((placed) => placed.square === 'h1')?.isDark).toBe(false);
  });

  it('reads every piece letter of both sides', () => {
    const pieces = readBoardPlacement(STARTING_FEN, 'white').map((placed) => placed.piece);
    expect(pieces.slice(0, 8)).toEqual(['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR']);
    expect(pieces.slice(8, 16)).toEqual(Array.from({ length: 8 }, () => 'bP'));
    expect(pieces.slice(48, 56)).toEqual(Array.from({ length: 8 }, () => 'wP'));
    expect(pieces.slice(56)).toEqual(['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']);
  });

  it('expands a digit into that many empty squares and places the piece after them', () => {
    const squares = readBoardPlacement(AFTER_E4_FEN, 'white');
    expect(squares.find((placed) => placed.square === 'e4')?.piece).toBe('wP');
    expect(squares.find((placed) => placed.square === 'd4')?.piece).toBeNull();
    expect(squares.find((placed) => placed.square === 'e2')?.piece).toBeNull();
    expect(squares.filter((placed) => placed.piece === null)).toHaveLength(32);
  });

  it('reads only the placement field, whatever follows it', () => {
    expect(readBoardPlacement(AFTER_E4_FEN, 'white')).toEqual(
      readBoardPlacement(AFTER_E4_FEN.replace(' b KQkq e3 0 1', ' w - - 9 99'), 'white'),
    );
  });

  it('turns the board round when Black sits at the bottom', () => {
    const squares = readBoardPlacement(STARTING_FEN, 'black');
    expect(squares[0]).toEqual({ square: 'h1', isDark: false, piece: 'wR' });
    expect(squares[63]).toEqual({ square: 'a8', isDark: false, piece: 'bR' });
  });
});
