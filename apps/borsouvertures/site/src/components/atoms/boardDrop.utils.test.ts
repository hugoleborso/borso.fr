import { describe, expect, it } from 'vitest';
import { buildDroppedUci, selectBoardDropDecision } from './boardDrop.utils';

// @FollowsBlueprint test-pure-unit
describe('selectBoardDropDecision', () => {
  it('ignores a piece dropped outside the board', () => {
    expect(selectBoardDropDecision(null)).toBe('ignored');
  });

  it('plays a piece dropped on a square', () => {
    expect(selectBoardDropDecision('e4')).toBe('played');
  });
});

describe('buildDroppedUci', () => {
  it('joins the two squares into a move', () => {
    expect(buildDroppedUci('e2', 'e4')).toBe('e2e4');
  });

  it('returns the source square alone when there is no target', () => {
    expect(buildDroppedUci('e2', null)).toBe('e2');
  });
});
