import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { derivePositionKey, isPositionKey } from './position-key.core';

function reachFen(movesSan: readonly string[]): string {
  const game = new Chess();
  for (const san of movesSan) game.move(san);
  return game.fen();
}

// @FollowsBlueprint test-pure-unit
describe('derivePositionKey', () => {
  it('keeps the first four FEN fields and drops the two move counters', () => {
    expect(derivePositionKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1')).toBe(
      'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -',
    );
  });

  it('gives one key to two move orders that reach the same position', () => {
    expect(derivePositionKey(reachFen(['d4', 'd5', 'Nf3', 'Nf6', 'e3']))).toBe(
      derivePositionKey(reachFen(['d4', 'd5', 'e3', 'Nf6', 'Nf3'])),
    );
  });

  it('has no en passant square after 1. e4, where no capture is possible', () => {
    expect(derivePositionKey(reachFen(['e4']))).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    );
  });

  it('carries an en passant square that changes a position key', () => {
    const withCapture = derivePositionKey(reachFen(['e4', 'd5', 'e5', 'f5']));
    expect(withCapture).toBe('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6');
    expect(withCapture).not.toBe(withCapture.replace(' f6', ' -'));
  });
});

describe('isPositionKey', () => {
  it('accepts a key derived from a FEN', () => {
    expect(isPositionKey(derivePositionKey(reachFen(['e4', 'd5', 'e5', 'f5'])))).toBe(true);
    expect(isPositionKey('8/8/8/8/8/8/8/K6k w - -')).toBe(true);
  });

  it('refuses a full FEN, a short board and free text', () => {
    expect(isPositionKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1')).toBe(false);
    expect(isPositionKey('8/8/8/8 w - -')).toBe(false);
    expect(isPositionKey('albin')).toBe(false);
  });
});
