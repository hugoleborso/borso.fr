import { describe, expect, it } from 'vitest';
import { readCapture, splitHeadFromRest } from './text.core';

describe('readCapture', () => {
  it('reads a named group that took part in the match', () => {
    expect(readCapture(/^(?<first>a)(?<second>b)?$/.exec('a')!, 'first')).toBe('a');
  });

  it('answers an empty string for an optional group that did not match', () => {
    expect(readCapture(/^(?<first>a)(?<second>b)?$/.exec('a')!, 'second')).toBe('');
  });

  it('answers an empty string when the pattern names no group', () => {
    expect(readCapture(/^(a)$/.exec('a')!, 'first')).toBe('');
  });
});

describe('splitHeadFromRest', () => {
  it('separates the text before the first separator from the segments after it', () => {
    expect(splitHeadFromRest('texte | a: 1 | b', '|')).toEqual({
      head: 'texte ',
      rest: [' a: 1 ', ' b'],
    });
  });

  it('answers the whole text and no segment when the separator is absent', () => {
    expect(splitHeadFromRest('texte', '|')).toEqual({ head: 'texte', rest: [] });
  });
});
