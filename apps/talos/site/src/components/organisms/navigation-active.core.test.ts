import { describe, expect, it } from 'vitest';
import { isBadgeShownOnTab, isNavigationDestinationActive } from './navigation-active.core';

describe('isNavigationDestinationActive', () => {
  it('lights the home tab on the home path only', () => {
    expect(isNavigationDestinationActive('/', '/')).toBe(true);
    expect(isNavigationDestinationActive('/todos', '/')).toBe(false);
  });

  it('lights a section on its own path and below it', () => {
    expect(isNavigationDestinationActive('/brain', '/brain')).toBe(true);
    expect(isNavigationDestinationActive('/brain/page/second-brain/moi', '/brain')).toBe(true);
  });

  it('does not light a section that only shares a prefix', () => {
    expect(isNavigationDestinationActive('/brainstorm', '/brain')).toBe(false);
  });
});

describe('isBadgeShownOnTab', () => {
  it('shows a positive count on the tab it belongs to only', () => {
    expect(isBadgeShownOnTab('/proposals', '/proposals', 1)).toBe(true);
    expect(isBadgeShownOnTab('/proposals', '/proposals', 0)).toBe(false);
    expect(isBadgeShownOnTab('/todos', '/proposals', 3)).toBe(false);
  });
});
