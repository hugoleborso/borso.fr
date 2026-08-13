import { describe, expect, it } from 'vitest';
import { evaluateTransition } from './transition.core';

const INSTRUMENTS = {
  guitar: { isHarmonic: true },
  piano: { isHarmonic: true },
  drums: { isHarmonic: false },
  bass: { isHarmonic: false },
};

/**
 * @Blueprint test-pure-unit
 * @BlueprintName Pure Unit Test
 * @BlueprintUsage Use for every `*.core.ts` and `*.utils.ts` file, which the per-file coverage gate holds at 100 percent.
 * @BlueprintDescription Calls the function with literal values and asserts on the returned value, with no mock, no fake timer and no database. The instrument map is one shared constant, and each case names the rule it pins, including the boundaries: an absent member, a null instrument, an instrument missing from the map, and the sorted order of the warning list.
 */
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
    const result = evaluateTransition({ hugo: 'guitar' }, { hugo: null }, INSTRUMENTS);
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['hugo'] });
  });

  it('treats absent members symmetrically to null instruments', () => {
    const result = evaluateTransition({ hugo: 'guitar' }, {}, INSTRUMENTS);
    expect(result).toEqual({ kind: 'warn', missingHarmonicMembers: ['hugo'] });
  });

  it('warns when only non-harmonic instruments are kept', () => {
    const result = evaluateTransition({ hugo: 'drums' }, { hugo: 'drums' }, INSTRUMENTS);
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
