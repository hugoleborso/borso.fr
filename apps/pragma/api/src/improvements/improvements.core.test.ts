import { describe, expect, it } from 'vitest';
import {
  type RankableImprovement,
  rankImprovements,
  readTally,
  summariseVotes,
} from './improvements.core';

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

function improvement(
  id: string,
  status: RankableImprovement['status'],
  voteCount: number,
  createdAt: string,
): RankableImprovement {
  return { id, status, voteCount, createdAt: new Date(createdAt) };
}

describe('rankImprovements', () => {
  it('puts the open statuses before the closed ones', () => {
    const ranked = rankImprovements([
      improvement('declined', 'declined', 9, '2026-01-01T00:00:00Z'),
      improvement('shipped', 'shipped', 9, '2026-01-01T00:00:00Z'),
      improvement('building', 'building', 0, '2026-01-01T00:00:00Z'),
      improvement('planned', 'planned', 0, '2026-01-01T00:00:00Z'),
      improvement('idea', 'idea', 0, '2026-01-01T00:00:00Z'),
    ]);
    expect(ranked.map((row) => row.id)).toEqual([
      'idea',
      'planned',
      'building',
      'shipped',
      'declined',
    ]);
  });

  it('puts the most voted first inside one status', () => {
    const ranked = rankImprovements([
      improvement('few', 'idea', 1, '2026-01-01T00:00:00Z'),
      improvement('many', 'idea', 4, '2026-01-02T00:00:00Z'),
    ]);
    expect(ranked.map((row) => row.id)).toEqual(['many', 'few']);
  });

  it('breaks a tie on votes with the older idea first', () => {
    const ranked = rankImprovements([
      improvement('newer', 'idea', 2, '2026-02-01T00:00:00Z'),
      improvement('older', 'idea', 2, '2026-01-01T00:00:00Z'),
    ]);
    expect(ranked.map((row) => row.id)).toEqual(['older', 'newer']);
  });

  it('leaves the argument untouched', () => {
    const rows = [
      improvement('b', 'planned', 0, '2026-01-01T00:00:00Z'),
      improvement('a', 'idea', 0, '2026-01-01T00:00:00Z'),
    ];
    rankImprovements(rows);
    expect(rows.map((row) => row.id)).toEqual(['b', 'a']);
  });
});
