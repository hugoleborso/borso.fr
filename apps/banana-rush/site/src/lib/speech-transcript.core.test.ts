import { describe, expect, it } from 'vitest';
import { readTranscript } from './speech-transcript.core';

// @FollowsBlueprint test-pure-unit
describe('readTranscript', () => {
  it('reads the one thing a recogniser heard', () => {
    expect(readTranscript({ results: { length: 1, 0: { 0: { transcript: 'trente' } } } })).toBe(
      'trente',
    );
  });

  it('joins the pieces of a longer utterance', () => {
    const heard = {
      length: 2,
      0: { 0: { transcript: 'je mise' } },
      1: { 0: { transcript: 'trente' } },
    };
    expect(readTranscript({ results: heard })).toBe('je mise trente');
  });

  it('skips a result the recogniser left empty', () => {
    const heard = { length: 2, 0: undefined, 1: { 0: { transcript: 'trente' } } };
    expect(readTranscript({ results: heard })).toBe('trente');
  });

  it('skips a result carrying no alternative', () => {
    const heard = { length: 1, 0: { 0: undefined } };
    expect(readTranscript({ results: heard })).toBe('');
  });

  it('answers nothing for a recogniser that heard nothing at all', () => {
    expect(readTranscript({ results: { length: 0 } })).toBe('');
  });

  it('trims the padding a recogniser leaves around what it heard', () => {
    expect(readTranscript({ results: { length: 1, 0: { 0: { transcript: '  trente  ' } } } })).toBe(
      'trente',
    );
  });
});
