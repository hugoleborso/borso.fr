import { describe, expect, it } from 'vitest';
import { TONE_BY_REVIEW_STATUS } from './review-tone.core';

// @FollowsBlueprint test-pure-unit
describe('TONE_BY_REVIEW_STATUS', () => {
  it('keeps the band neutral while the card is still asking', () => {
    expect(TONE_BY_REVIEW_STATUS['opponent-moving']).toBe('asking');
    expect(TONE_BY_REVIEW_STATUS['your-move']).toBe('asking');
  });

  it('colours the band with the answer once the card is answered', () => {
    expect(TONE_BY_REVIEW_STATUS.recalled).toBe('recalled');
    expect(TONE_BY_REVIEW_STATUS.missed).toBe('missed');
  });
});
