import { describe, expect, it } from 'vitest';
import { projectImprovementForTool } from './improvement-tool.core';

// @FollowsBlueprint test-pure-unit
describe('projectImprovementForTool', () => {
  it('keeps the title, status and details with the vote count and whether you voted', () => {
    expect(
      projectImprovementForTool({
        id: 'improvement-1',
        title: 'Click track',
        details: 'On stage',
        status: 'idea',
        voteCount: 2,
        votedByViewer: true,
      }),
    ).toEqual({
      id: 'improvement-1',
      title: 'Click track',
      status: 'idea',
      votes: 2,
      mine: true,
      details: 'On stage',
    });
  });
});
