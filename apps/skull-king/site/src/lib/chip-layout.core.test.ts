import { describe, expect, it } from 'vitest';
import {
  isChipChosen,
  listChipValues,
  selectChipColumns,
  selectChipState,
} from './chip-layout.core';

// @FollowsBlueprint test-pure-unit
describe('selectChipColumns', () => {
  it('keeps up to nine chips on one line, the most eight players are dealt', () => {
    expect(selectChipColumns(2)).toBe(2);
    expect(selectChipColumns(9)).toBe(9);
  });

  it('splits ten chips or more over two lines', () => {
    expect(selectChipColumns(10)).toBe(5);
    expect(selectChipColumns(11)).toBe(6);
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
