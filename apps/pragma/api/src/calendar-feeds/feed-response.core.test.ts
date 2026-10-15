import { describe, expect, it } from 'vitest';
import { classifyFeedStatus, isOverSizeLimit } from './feed-response.core';

describe('classifyFeedStatus', () => {
  it.each([301, 302, 303, 307, 308])('follows %i', (status) => {
    expect(classifyFeedStatus(status)).toBe('redirect');
  });

  it.each([401, 403, 404, 410])(
    'reads %i as an address the provider no longer serves',
    (status) => {
      expect(classifyFeedStatus(status)).toBe('gone');
    },
  );

  it.each([200, 299])('reads %i as a body to parse', (status) => {
    expect(classifyFeedStatus(status)).toBe('readable');
  });

  it.each([199, 300, 304, 400, 429, 500, 503])('reads %i as a failure', (status) => {
    expect(classifyFeedStatus(status)).toBe('failed');
  });
});

describe('isOverSizeLimit', () => {
  it('allows a body up to the limit and refuses one byte more', () => {
    expect(isOverSizeLimit(16, 16)).toBe(false);
    expect(isOverSizeLimit(17, 16)).toBe(true);
  });
});
