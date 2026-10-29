import { describe, expect, it } from 'vitest';
import { joinSummaryItems, keepTogether } from './summary-line.utils';

const NO_BREAK_SPACE = ' ';

// @FollowsBlueprint test-pure-unit
describe('keepTogether', () => {
  it('binds every word of an item with a non-breaking space', () => {
    expect(keepTogether('1 h 17')).toBe(`1${NO_BREAK_SPACE}h${NO_BREAK_SPACE}17`);
  });
});

describe('joinSummaryItems', () => {
  it('breaks a line only after a separator, never inside an item', () => {
    const line = joinSummaryItems(['21 morceaux', '1 h 17']);
    expect(line).toBe(
      `21${NO_BREAK_SPACE}morceaux${NO_BREAK_SPACE}· 1${NO_BREAK_SPACE}h${NO_BREAK_SPACE}17`,
    );
    expect(line.split(' ')).toEqual([
      `21${NO_BREAK_SPACE}morceaux${NO_BREAK_SPACE}·`,
      `1${NO_BREAK_SPACE}h${NO_BREAK_SPACE}17`,
    ]);
  });

  it('leaves out the items that are not known', () => {
    expect(joinSummaryItems([null, '3 songs', null])).toBe(`3${NO_BREAK_SPACE}songs`);
  });

  it('writes nothing when no item is known', () => {
    expect(joinSummaryItems([null])).toBe('');
  });
});
