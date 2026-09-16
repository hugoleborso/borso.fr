import { describe, expect, it } from 'vitest';
import {
  parseAvailableSupport,
  resolveConcertMood,
  serializeAvailableSupport,
} from './bar-support.core';

describe('parseAvailableSupport', () => {
  it('reads the list a bar was saved with', () => {
    expect(parseAvailableSupport('["lights","pa-system"]')).toEqual(['pa-system', 'lights']);
  });

  it('reads a bar recorded before this column existed as lending nothing', () => {
    expect(parseAvailableSupport(null)).toEqual([]);
  });

  it('reads text that is not JSON as lending nothing', () => {
    expect(parseAvailableSupport('pa-system')).toEqual([]);
  });

  it('reads JSON the schema refuses as lending nothing', () => {
    expect(parseAvailableSupport('{"pa":true}')).toEqual([]);
    expect(parseAvailableSupport('["smoke-machine"]')).toEqual([]);
  });
});

describe('serializeAvailableSupport', () => {
  it('writes the declared order, whatever order it was given', () => {
    expect(serializeAvailableSupport(['sound-engineer', 'pa-system'])).toBe(
      '["pa-system","sound-engineer"]',
    );
  });

  it('writes each support once', () => {
    expect(serializeAvailableSupport(['lights', 'lights'])).toBe('["lights"]');
  });

  it('writes an empty list for a bar that lends nothing', () => {
    expect(serializeAvailableSupport([])).toBe('[]');
  });

  it('round-trips through the parser', () => {
    const supports = ['pa-system', 'sound-engineer'] as const;
    expect(parseAvailableSupport(serializeAvailableSupport(supports))).toEqual([...supports]);
  });
});

describe('resolveConcertMood', () => {
  it('names every mood the column may hold', () => {
    for (const mood of ['chill', 'gig', 'ticketed'] as const) {
      expect(resolveConcertMood(mood)).toBe(mood);
    }
  });

  it('reads a null or unknown mood as not known yet', () => {
    expect(resolveConcertMood(null)).toBeNull();
    expect(resolveConcertMood('enormous')).toBeNull();
  });
});
