import { describe, expect, it } from 'vitest';
import { pageItems } from './tool-page.core';

const ITEMS = ['a', 'b', 'c', 'd', 'e'];
const DEFAULT_LIMIT = 2;

// @FollowsBlueprint test-pure-unit
describe('pageItems', () => {
  it('answers the first page at the default limit, with the cursor of the next', () => {
    expect(pageItems(ITEMS, {}, DEFAULT_LIMIT)).toEqual({
      items: ['a', 'b'],
      total: 5,
      nextCursor: '2',
    });
  });

  it('continues from a cursor with the limit asked for', () => {
    expect(pageItems(ITEMS, { cursor: '2', limit: 2 }, DEFAULT_LIMIT)).toEqual({
      items: ['c', 'd'],
      total: 5,
      nextCursor: '4',
    });
  });

  it('gives no cursor on the page that reaches the end', () => {
    expect(pageItems(ITEMS, { cursor: '3', limit: 2 }, DEFAULT_LIMIT)).toEqual({
      items: ['d', 'e'],
      total: 5,
    });
    expect(pageItems(ITEMS, { limit: 5 }, DEFAULT_LIMIT)).toEqual({ items: ITEMS, total: 5 });
  });

  it('starts over from a cursor that is not a position', () => {
    expect(pageItems(ITEMS, { cursor: 'later' }, DEFAULT_LIMIT).items).toEqual(['a', 'b']);
    expect(pageItems(ITEMS, { cursor: '-3' }, DEFAULT_LIMIT).items).toEqual(['a', 'b']);
  });
});
