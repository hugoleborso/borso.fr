import { describe, expect, it } from 'vitest';
import { isMoreTabActive, isNavigationDestinationActive } from './navigation-active.core';

const ADMIN_DESTINATIONS = ['/members', '/instruments'];

// @FollowsBlueprint test-pure-unit
describe('isNavigationDestinationActive', () => {
  it('lights the destination up on its own path', () => {
    expect(isNavigationDestinationActive('/catalog', '/catalog')).toBe(true);
  });

  it('lights it up on a page below it', () => {
    expect(isNavigationDestinationActive('/catalog/3/edit', '/catalog')).toBe(true);
  });

  it('leaves another destination dark', () => {
    expect(isNavigationDestinationActive('/sessions', '/catalog')).toBe(false);
  });
});

// @FollowsBlueprint test-pure-unit
describe('isMoreTabActive', () => {
  it('lights the tab up while its drawer is open', () => {
    expect(isMoreTabActive('/catalog', ADMIN_DESTINATIONS, true)).toBe(true);
  });

  it('lights it up on a destination the drawer owns', () => {
    expect(isMoreTabActive('/instruments', ADMIN_DESTINATIONS, false)).toBe(true);
  });

  it('lights it up on a page below such a destination', () => {
    expect(isMoreTabActive('/members/7', ADMIN_DESTINATIONS, false)).toBe(true);
  });

  it('leaves it dark elsewhere with the drawer closed', () => {
    expect(isMoreTabActive('/catalog', ADMIN_DESTINATIONS, false)).toBe(false);
  });
});
