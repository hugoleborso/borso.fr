import { describe, expect, it } from 'vitest';
import { selectActiveTab, SHELL_TABS } from './navigation-active.core';

// @FollowsBlueprint test-pure-unit
describe('selectActiveTab', () => {
  it('lights Home up on the start screen only', () => {
    expect(selectActiveTab('/')).toBe('home');
    expect(selectActiveTab('/sessions')).toBe('sessions');
  });

  it.each([
    ['/sessions', 'sessions'],
    ['/sessions/7', 'sessions'],
    ['/setlists', 'sessions'],
    ['/setlists/3/vote', 'sessions'],
    ['/catalog', 'songs'],
    ['/catalog/3/edit', 'songs'],
    ['/band', 'band'],
    ['/tasks', 'band'],
    ['/members', 'band'],
    ['/instruments', 'band'],
    ['/bars', 'band'],
    ['/compos', 'band'],
    ['/improvements', 'band'],
    ['/account', 'band'],
  ] as const)('lights the tab holding %s up', (pathname, tabId) => {
    expect(selectActiveTab(pathname)).toBe(tabId);
  });

  it('matches whole path segments, not a prefix of a word', () => {
    expect(selectActiveTab('/sessionsarchive')).toBeNull();
  });

  it('lights no tab up on a path no tab holds', () => {
    expect(selectActiveTab('/vote')).toBeNull();
  });

  it('declares the four tabs in order', () => {
    expect(SHELL_TABS.map((tab) => tab.to)).toEqual(['/', '/sessions', '/catalog', '/band']);
  });
});
