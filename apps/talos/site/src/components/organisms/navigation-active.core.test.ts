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

  it('lights a section on an address that stands for it, and below it', () => {
    expect(isNavigationDestinationActive('/work-todos/4e6590b574', '/todos', ['/work-todos'])).toBe(
      true,
    );
    expect(isNavigationDestinationActive('/work-todos', '/todos', ['/work-todos'])).toBe(true);
    expect(isNavigationDestinationActive('/work-todos', '/todos')).toBe(false);
    expect(isNavigationDestinationActive('/workshop', '/todos', ['/work-todos'])).toBe(false);
  });

  it('lights a section when any one of several addresses stands for it, and none when there is none', () => {
    expect(
      isNavigationDestinationActive('/work-todos', '/todos', ['/archive', '/work-todos']),
    ).toBe(true);
    expect(isNavigationDestinationActive('/work-todos', '/todos', [])).toBe(false);
  });
});

describe('isBadgeShownOnTab', () => {
  it('shows a positive count on the tab it belongs to only', () => {
    expect(isBadgeShownOnTab('/proposals', '/proposals', 1)).toBe(true);
    expect(isBadgeShownOnTab('/proposals', '/proposals', 0)).toBe(false);
    expect(isBadgeShownOnTab('/todos', '/proposals', 3)).toBe(false);
  });
});
