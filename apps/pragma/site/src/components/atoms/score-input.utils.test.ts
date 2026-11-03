import { describe, expect, it } from 'vitest';
import { toScoreEditText } from './score-input.utils';

describe('toScoreEditText', () => {
  it('reads an emptied field as the empty text that clears the score', () => {
    expect(toScoreEditText(Number.NaN)).toBe('');
  });

  it('writes a committed score as its digits', () => {
    expect(toScoreEditText(4)).toBe('4');
  });

  it('writes a zero score as 0, not as a cleared field', () => {
    expect(toScoreEditText(0)).toBe('0');
  });
});
