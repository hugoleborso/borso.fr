import { describe, expect, it } from 'vitest';
import { projectImprovementForTool } from './improvement-tool.core';

const FILED_AT = '2026-11-04T09:30:00.000Z';

// @FollowsBlueprint test-pure-unit
describe('projectImprovementForTool', () => {
  it('keeps the title, status, kind, filing time and details with the vote count and whether you voted', () => {
    expect(
      projectImprovementForTool({
        id: 'improvement-1',
        title: 'Click track',
        details: 'On stage',
        status: 'idea',
        kind: 'bug',
        createdAt: new Date(FILED_AT),
        voteCount: 2,
        votedByViewer: true,
      }),
    ).toEqual({
      id: 'improvement-1',
      title: 'Click track',
      status: 'idea',
      kind: 'bug',
      createdAt: FILED_AT,
      votes: 2,
      mine: true,
      details: 'On stage',
    });
  });
});
