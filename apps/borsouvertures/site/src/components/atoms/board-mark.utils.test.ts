import { describe, expect, it } from 'vitest';
import { placeBoardMark } from './board-mark.utils';

// @FollowsBlueprint test-pure-unit
describe('placeBoardMark', () => {
  it('centres a large mark on the board when no square is named', () => {
    expect(placeBoardMark(null, 'white')).toEqual({
      leftPercent: 36,
      topPercent: 36,
      sizePercent: 28,
    });
    expect(placeBoardMark(null, 'black')).toEqual(placeBoardMark(null, 'white'));
  });

  it("sits a small mark on the top right corner of the square, seen from White's side", () => {
    expect(placeBoardMark('d5', 'white')).toEqual({
      leftPercent: 46.25,
      topPercent: 33.75,
      sizePercent: 7.5,
    });
  });

  it("mirrors the square for a board seen from Black's side", () => {
    expect(placeBoardMark('d5', 'black')).toEqual({
      leftPercent: 58.75,
      topPercent: 46.25,
      sizePercent: 7.5,
    });
  });

  it('keeps the mark inside the board on the top rank and the right file', () => {
    expect(placeBoardMark('h8', 'white')).toEqual({
      leftPercent: 92.5,
      topPercent: 0,
      sizePercent: 7.5,
    });
    expect(placeBoardMark('a1', 'black')).toEqual({
      leftPercent: 92.5,
      topPercent: 0,
      sizePercent: 7.5,
    });
  });

  it('leaves a square away from the edges where its corner is', () => {
    expect(placeBoardMark('a1', 'white')).toEqual({
      leftPercent: 8.75,
      topPercent: 83.75,
      sizePercent: 7.5,
    });
    expect(placeBoardMark('h8', 'black')).toEqual({
      leftPercent: 8.75,
      topPercent: 83.75,
      sizePercent: 7.5,
    });
  });
});
