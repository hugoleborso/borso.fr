import { describe, expect, it } from 'vitest';
import { isNavDestinationActive } from './nav-active.core';

// @FollowsBlueprint test-pure-unit
describe('isNavDestinationActive', () => {
  it('lights the destination up on its own path', () => {
    expect(isNavDestinationActive('/catalog', '/catalog')).toBe(true);
  });

  it('lights it up on a page below it', () => {
    expect(isNavDestinationActive('/catalog/3/edit', '/catalog')).toBe(true);
  });

  it('leaves another destination dark', () => {
    expect(isNavDestinationActive('/sessions', '/catalog')).toBe(false);
  });
});
