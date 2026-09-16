import { describe, expect, it } from 'vitest';
import { readTally, summariseVotes } from './improvements.core';

const VIEWER = 'viewer-member';
const OTHER = 'other-member';

describe('summariseVotes', () => {
  it('counts one entry per vote and leaves the viewer flag down when none is theirs', () => {
    const tallies = summariseVotes(
      [
        { improvementId: 'a', memberId: OTHER },
        { improvementId: 'a', memberId: 'third-member' },
      ],
      VIEWER,
    );
    expect(readTally(tallies, 'a')).toEqual({ voteCount: 2, votedByViewer: false });
  });

  it('raises the viewer flag whichever position the viewer voted in', () => {
    const viewerFirst = summariseVotes(
      [
        { improvementId: 'a', memberId: VIEWER },
        { improvementId: 'a', memberId: OTHER },
      ],
      VIEWER,
    );
    const viewerLast = summariseVotes(
      [
        { improvementId: 'a', memberId: OTHER },
        { improvementId: 'a', memberId: VIEWER },
      ],
      VIEWER,
    );
    expect(readTally(viewerFirst, 'a')).toEqual({ voteCount: 2, votedByViewer: true });
    expect(readTally(viewerLast, 'a')).toEqual({ voteCount: 2, votedByViewer: true });
  });

  it('keeps one tally per improvement', () => {
    const tallies = summariseVotes(
      [
        { improvementId: 'a', memberId: VIEWER },
        { improvementId: 'b', memberId: OTHER },
      ],
      VIEWER,
    );
    expect(readTally(tallies, 'a').votedByViewer).toBe(true);
    expect(readTally(tallies, 'b').votedByViewer).toBe(false);
  });
});

describe('readTally', () => {
  it('answers an empty tally for an improvement nobody voted on', () => {
    expect(readTally(summariseVotes([], VIEWER), 'a')).toEqual({
      voteCount: 0,
      votedByViewer: false,
    });
  });
});
