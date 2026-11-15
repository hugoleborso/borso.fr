import { describe, expect, it } from 'vitest';
import { buildOrderAddressFromSession, selectOrderExitPath } from './setlist-order.core';

// @FollowsBlueprint test-pure-unit
describe('selectOrderExitPath', () => {
  it('returns to the session when the Order screen was opened from it', () => {
    expect(selectOrderExitPath('set-1', '/sessions/abc-1')).toBe('/sessions/abc-1');
  });

  it('returns to the setlist for anything else, so the address cannot send a member elsewhere', () => {
    expect(selectOrderExitPath('set-1', null)).toBe('/setlists/set-1');
    expect(selectOrderExitPath('set-1', 'https://example.com')).toBe('/setlists/set-1');
    expect(selectOrderExitPath('set-1', '//evil/sessions/a')).toBe('/setlists/set-1');
    expect(selectOrderExitPath('set-1', '/sessions/a/practice')).toBe('/setlists/set-1');
  });
});

describe('buildOrderAddressFromSession', () => {
  it('carries the session path in the back parameter', () => {
    expect(buildOrderAddressFromSession('set-1', 'abc')).toBe(
      '/setlists/set-1/order?back=%2Fsessions%2Fabc',
    );
  });
});
