import { describe, expect, it } from 'vitest';
import {
  isPromotionPiece,
  isSquare,
  parsePromotion,
  toSquare,
  uciFromSquare,
  uciPromotion,
  uciToArrow,
  uciToSquare,
} from './uciSquare.utils';

describe('isSquare / toSquare', () => {
  it('accepts valid algebraic squares', () => {
    expect(isSquare('a1')).toBe(true);
    expect(isSquare('h8')).toBe(true);
    expect(toSquare('e4')).toBe('e4');
  });

  it('rejects malformed squares', () => {
    expect(isSquare('z9')).toBe(false);
    expect(isSquare('e')).toBe(false);
    expect(() => toSquare('zz')).toThrow(/Invalid square/);
  });
});

describe('isPromotionPiece / parsePromotion', () => {
  it('accepts q/r/b/n', () => {
    expect(isPromotionPiece('q')).toBe(true);
    expect(parsePromotion('r')).toBe('r');
    expect(parsePromotion('b')).toBe('b');
    expect(parsePromotion('n')).toBe('n');
  });

  it('rejects king/pawn and noise', () => {
    expect(isPromotionPiece('k')).toBe(false);
    expect(parsePromotion('p')).toBeUndefined();
    expect(parsePromotion('')).toBeUndefined();
    expect(parsePromotion('xx')).toBeUndefined();
  });
});

describe('UCI helpers', () => {
  it('parses from/to/promotion slices', () => {
    expect(uciFromSquare('e2e4')).toBe('e2');
    expect(uciToSquare('e2e4')).toBe('e4');
    expect(uciPromotion('a7a8q')).toBe('q');
    expect(uciPromotion('e2e4')).toBeUndefined();
  });

  it('builds a chessboard arrow', () => {
    expect(uciToArrow('g1f3')).toEqual(['g1', 'f3']);
  });
});
