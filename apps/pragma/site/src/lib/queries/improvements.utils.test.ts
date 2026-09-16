import { describe, expect, it } from 'vitest';
import { applyVoteIntent, selectVoteIntent } from './improvements.utils';

describe('selectVoteIntent', () => {
  it('offers to withdraw a vote already cast and to cast one otherwise', () => {
    expect(selectVoteIntent(true)).toBe('withdraw');
    expect(selectVoteIntent(false)).toBe('cast');
  });
});

describe('applyVoteIntent', () => {
  it('adds the viewer to the count when casting', () => {
    expect(applyVoteIntent({ voteCount: 2, votedByViewer: false }, 'cast')).toEqual({
      voteCount: 3,
      votedByViewer: true,
    });
  });

  it('removes the viewer from the count when withdrawing', () => {
    expect(applyVoteIntent({ voteCount: 3, votedByViewer: true }, 'withdraw')).toEqual({
      voteCount: 2,
      votedByViewer: false,
    });
  });

  it('leaves the row untouched when the intent matches what the viewer already did', () => {
    const cast = { voteCount: 3, votedByViewer: true };
    const notCast = { voteCount: 3, votedByViewer: false };
    expect(applyVoteIntent(cast, 'cast')).toBe(cast);
    expect(applyVoteIntent(notCast, 'withdraw')).toBe(notCast);
  });
});
