import { describe, expect, it } from 'vitest';
import { toAnchorName } from './menu-anchor.utils';

// @FollowsBlueprint test-pure-unit
describe('toAnchorName', () => {
  it('turns a React id into a CSS dashed identifier', () => {
    expect(toAnchorName('«r1»')).toBe('--menu-r1');
    expect(toAnchorName(':r2:')).toBe('--menu-r2');
    expect(toAnchorName('_r_3_')).toBe('--menu-_r_3_');
  });
});
