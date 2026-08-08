import { describe, expect, it } from 'vitest';
import { selectVisibleBookMoves } from './bookArrows.utils';

const BOOK_MOVES = ['e2e4', 'd2d4'];

describe('selectVisibleBookMoves', () => {
  it('returns the book moves when the arrows are visible', () => {
    expect(selectVisibleBookMoves(BOOK_MOVES, true)).toEqual(BOOK_MOVES);
  });

  it('returns nothing when the arrows are hidden', () => {
    expect(selectVisibleBookMoves(BOOK_MOVES, false)).toEqual([]);
  });
});
