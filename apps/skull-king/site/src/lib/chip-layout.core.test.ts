import { describe, expect, it } from 'vitest';
import {
  isChipChosen,
  listChipValues,
  MOST_CHIPS_ON_ONE_LINE,
  selectChipColumns,
  selectChipState,
} from './chip-layout.core';

// @FollowsBlueprint test-pure-unit
describe('selectChipColumns', () => {
  it('keeps every chip on one line while they fit at full size', () => {
    expect(selectChipColumns(2, 5)).toBe(2);
    expect(selectChipColumns(5, 5)).toBe(5);
    expect(selectChipColumns(6, 6)).toBe(6);
  });

  it('wraps onto two even lines rather than shrink a chip below a fingertip', () => {
    expect(selectChipColumns(6, 5)).toBe(3);
    expect(selectChipColumns(9, 5)).toBe(5);
    expect(selectChipColumns(10, 5)).toBe(5);
    expect(selectChipColumns(11, 6)).toBe(6);
  });

  it('takes a third line only for eleven chips beside a mark', () => {
    expect(selectChipColumns(11, 5)).toBe(4);
  });

  it('fits fewer chips beside a mark than across a card', () => {
    expect(MOST_CHIPS_ON_ONE_LINE.ground).toBe(5);
    expect(MOST_CHIPS_ON_ONE_LINE.card).toBe(6);
  });
});

describe('listChipValues', () => {
  it('lists every value from zero to the highest', () => {
    expect(listChipValues(3)).toEqual([0, 1, 2, 3]);
  });

  it('lists zero alone for a highest of zero', () => {
    expect(listChipValues(0)).toEqual([0]);
  });
});

describe('selectChipState', () => {
  const style = { chosen: 2, blocked: 1, tone: 'accent', surface: 'ground' } as const;

  it('marks the chosen value in the tone of the row', () => {
    expect(selectChipState(style, 2)).toBe('chosen');
    expect(selectChipState({ ...style, tone: 'missed' }, 2)).toBe('missed');
  });

  it('blocks the blocked value', () => {
    expect(selectChipState(style, 1)).toBe('blocked');
  });

  it('draws the other values for the surface they sit on', () => {
    expect(selectChipState(style, 0)).toBe('idle');
    expect(selectChipState({ ...style, surface: 'card' }, 0)).toBe('raised');
  });

  it('keeps the chosen value chosen when it is also the blocked one', () => {
    expect(selectChipState({ ...style, blocked: 2 }, 2)).toBe('chosen');
  });
});

describe('isChipChosen', () => {
  it('reads both chosen tones as chosen and nothing else', () => {
    expect(isChipChosen('chosen')).toBe(true);
    expect(isChipChosen('missed')).toBe(true);
    expect(isChipChosen('idle')).toBe(false);
    expect(isChipChosen('blocked')).toBe(false);
  });
});
