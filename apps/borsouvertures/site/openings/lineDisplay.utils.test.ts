import { describe, expect, it } from 'vitest';
import { shortLineName } from './lineDisplay.utils';
import type { Line, Opening, Variation } from './types';

const opening: Opening = {
  id: 'italian',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [],
};

const variation: Variation = {
  id: 'classical',
  name: 'Classical Variation',
  lines: [],
};

function lineWith(name: string): Line {
  return { id: 'x', name, eco: 'C50', movesSan: [], movesUci: [] };
}

describe('shortLineName', () => {
  it('strips both the opening prefix and the variation prefix from a colon-delimited line', () => {
    expect(
      shortLineName(opening, variation, lineWith("Italian Game: Classical Variation, Greco's Attack")),
    ).toBe("Greco's Attack");
  });

  it('returns null when the line name is exactly the opening name', () => {
    expect(shortLineName(opening, variation, lineWith('Italian Game'))).toBeNull();
  });

  it('returns null when the line name is exactly the variation name', () => {
    const main: Variation = { id: 'main', name: 'Main Line', lines: [] };
    expect(shortLineName(opening, main, lineWith('Main Line'))).toBeNull();
  });

  it('returns null when the line name reduces to empty after stripping', () => {
    expect(
      shortLineName(opening, variation, lineWith('Italian Game: Classical Variation')),
    ).toBeNull();
  });

  it('returns the line name unchanged when no prefix matches', () => {
    expect(shortLineName(opening, variation, lineWith('Random Sideline'))).toBe('Random Sideline');
  });

  it('strips only the opening prefix when the variation prefix does not match', () => {
    expect(
      shortLineName(opening, variation, lineWith('Italian Game: Anti-Fried Liver')),
    ).toBe('Anti-Fried Liver');
  });

  it('returns the rest verbatim when only the opening prefix matches without a comma', () => {
    expect(shortLineName(opening, variation, lineWith('Italian Game: Greco'))).toBe('Greco');
  });
});
