import { describe, expect, it } from 'vitest';
import { evaluateTransition } from './transition.core';

const INSTRUMENTS = {
  guitar: { isHarmonic: true },
  piano: { isHarmonic: true },
  drums: { isHarmonic: false },
  bass: { isHarmonic: false },
};

describe('evaluateTransition', () => {
  it('marks the pair safe when the same member holds a harmonic instrument across both songs', () => {
    const result = evaluateTransition(
      { hugo: 'guitar', gui: 'drums' },
      { hugo: 'guitar', gui: 'bass' },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'safe' });
  });

  it('marks the pair warn when nobody keeps a harmonic instrument', () => {
    const result = evaluateTransition(
      { hugo: 'guitar', gui: 'drums' },
      { hugo: 'drums', gui: 'guitar' },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['gui', 'hugo'] });
  });

  it('treats null instruments as not held', () => {
    const result = evaluateTransition(
      { hugo: 'guitar' },
      { hugo: null },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['hugo'] });
  });

  it('treats absent members symmetrically to null instruments', () => {
    const result = evaluateTransition({ hugo: 'guitar' }, {}, INSTRUMENTS);
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['hugo'] });
  });

  it('warns when only non-harmonic instruments are kept', () => {
    const result = evaluateTransition(
      { hugo: 'drums' },
      { hugo: 'drums' },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: [] });
  });

  it('safely handles the same song twice (the lineup is identical)', () => {
    const result = evaluateTransition(
      { hugo: 'guitar', gui: 'drums' },
      { hugo: 'guitar', gui: 'drums' },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'safe' });
  });

  it('ignores instruments referenced in the lineup but absent from the instrument map', () => {
    const result = evaluateTransition(
      { hugo: 'ghost-instrument' },
      { hugo: 'guitar' },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['hugo'] });
  });

  it('returns missingHarmonicMembers sorted deterministically', () => {
    const result = evaluateTransition(
      { zoe: 'guitar', alpha: 'piano' },
      { mike: 'guitar' },
      INSTRUMENTS,
    );
    if (result.kind !== 'warn') throw new Error('expected warn');
    expect(result.missingHarmonicMembers).toEqual(['alpha', 'mike', 'zoe']);
  });
});
