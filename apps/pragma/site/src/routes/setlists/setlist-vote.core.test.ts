import { describe, expect, it } from 'vitest';
import { isVotingPageState, selectVotePageState } from './setlist-vote.core';

// @FollowsBlueprint test-pure-unit
describe('selectVotePageState', () => {
  it('waits while the board has not arrived', () => {
    expect(selectVotePageState({ hasBoard: false, status: 'voting', isClosingOpen: false })).toBe(
      'loading',
    );
  });

  it('shows the deck while the vote is open', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'voting', isClosingOpen: false })).toBe(
      'voting',
    );
  });

  it('shows the proposal once the closing is asked for', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'voting', isClosingOpen: true })).toBe(
      'closing',
    );
  });

  it('shows neither on a setlist that is not in its voting phase', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'locked', isClosingOpen: false })).toBe(
      'locked',
    );
    expect(selectVotePageState({ hasBoard: true, status: 'locked', isClosingOpen: true })).toBe(
      'locked',
    );
  });
});

describe('isVotingPageState', () => {
  it('is true only while the deck is the thing to show', () => {
    expect(isVotingPageState('voting', false, true)).toBe(true);
    expect(isVotingPageState('voting', true, true)).toBe(false);
    expect(isVotingPageState('locked', false, true)).toBe(false);
    expect(isVotingPageState('voting', false, false)).toBe(false);
  });
});
