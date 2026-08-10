import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { describeMoveInStandardNotation } from './moveNotation.utils';

const STARTING_FEN = new Chess().fen();

// @FollowsBlueprint test-pure-unit
describe('describeMoveInStandardNotation', () => {
  it('renders a knight move in standard algebraic notation', () => {
    expect(describeMoveInStandardNotation('g1f3', STARTING_FEN)).toBe('Nf3');
  });

  it('renders a pawn move in standard algebraic notation', () => {
    expect(describeMoveInStandardNotation('e2e4', STARTING_FEN)).toBe('e4');
  });

  it('falls back to the move itself when it is illegal from the position', () => {
    expect(describeMoveInStandardNotation('e2e5', STARTING_FEN)).toBe('e2e5');
  });

  it('falls back to the move itself when it names no square', () => {
    expect(describeMoveInStandardNotation('zzzz', STARTING_FEN)).toBe('zzzz');
  });
});
