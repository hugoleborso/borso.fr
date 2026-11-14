import { describe, expect, it } from 'vitest';
import { selectRouteName } from './route-name.core';

// @FollowsBlueprint test-pure-unit
describe('selectRouteName', () => {
  it('names the request after the last route handler, skipping the middleware around it', () => {
    expect(
      selectRouteName([
        { method: 'ALL', path: '*' },
        { method: 'GET', path: '/api/*' },
        { method: 'GET', path: '/api/rows/*' },
        { method: 'GET', path: '/api/rows/:rowId' },
        { method: 'ALL', path: '/api/rows/:rowId' },
      ]),
    ).toBe('/api/rows/:rowId');
  });

  it('names a request no handler matched without echoing its path', () => {
    expect(selectRouteName([{ method: 'ALL', path: '*' }])).toBe('unmatched route');
  });
});
