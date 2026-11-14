import { describe, expect, it } from 'vitest';
import { selectReviewMark } from './review-mark.core';

// @FollowsBlueprint test-pure-unit
describe('selectReviewMark', () => {
  it('draws no mark while the card still asks', () => {
    expect(selectReviewMark('opponent-moving', [], 'black')).toBeNull();
    expect(selectReviewMark('your-move', ['d7d5'], 'black')).toBeNull();
  });

  it('centres the check on the board once the card is recalled', () => {
    expect(selectReviewMark('recalled', ['d7d5'], 'black')).toEqual({
      tone: 'recalled',
      square: null,
    });
  });

  it('puts the cross on the square the book move lands on, so the move stays readable', () => {
    expect(selectReviewMark('missed', ['d7d5'], 'black')).toEqual({ tone: 'missed', square: 'd5' });
    expect(selectReviewMark('missed', ['e5d3', 'g4d1'], 'black')).toEqual({
      tone: 'missed',
      square: 'd1',
    });
  });

  it('puts the cross in the top right corner when the board draws no move, as on a name card', () => {
    expect(selectReviewMark('missed', [], 'white')).toEqual({ tone: 'missed', square: 'h8' });
    expect(selectReviewMark('missed', [], 'black')).toEqual({ tone: 'missed', square: 'a1' });
  });
});
