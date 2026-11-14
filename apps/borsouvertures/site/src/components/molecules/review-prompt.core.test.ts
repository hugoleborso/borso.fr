import { describe, expect, it } from 'vitest';
import { type ReviewPromptTexts, selectReviewPrompt } from './review-prompt.core';

const TEXTS: ReviewPromptTexts = {
  question: 'Your move',
  context: 'White played 1. d4',
  notation: '1... d5',
  words: 'black pawn on d7 goes to d5',
  outcome: 'Missed. The book move is 1... d5.',
};

// @FollowsBlueprint test-pure-unit
describe('selectReviewPrompt', () => {
  it('asks the question beside what the opponent played, and speaks no outcome yet', () => {
    const asking = {
      lead: 'Your move',
      detail: 'White played 1. d4',
      leadFont: 'text',
      spoken: '',
    };
    expect(selectReviewPrompt('your-move', TEXTS)).toEqual(asking);
    expect(selectReviewPrompt('opponent-moving', TEXTS)).toEqual(asking);
  });

  it('writes the book move in notation and in words once answered, and speaks the outcome', () => {
    const answered = {
      lead: '1... d5',
      detail: 'black pawn on d7 goes to d5',
      leadFont: 'notation',
      spoken: 'Missed. The book move is 1... d5.',
    };
    expect(selectReviewPrompt('missed', TEXTS)).toEqual(answered);
    expect(selectReviewPrompt('recalled', TEXTS)).toEqual(answered);
  });
});
