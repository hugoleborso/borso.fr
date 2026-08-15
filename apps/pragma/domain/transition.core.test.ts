import { describe, expect, it } from 'vitest';
import { evaluateTransition } from './transition.core';

const INSTRUMENTS = {
  guitar: { family: 'harmonic' },
  piano: { family: 'harmonic' },
  drums: { family: 'percussive' },
  vocals: { family: 'vocal' },
  triangle: { family: 'other' },
} as const;

/**
 * @Blueprint test-pure-unit
 * @BlueprintName Pure Unit Test
 * @BlueprintUsage Use for every `*.core.ts` and `*.utils.ts` file, which the per-file coverage gate holds at 100 percent.
 * @BlueprintDescription Calls the function with literal values and asserts on the returned value, with no mock, no fake timer and no database. The instrument map is one shared constant, and each case names the rule it pins, including the boundaries: a member sitting out, an instrument missing from the map, a member holding two instruments at once, and the sorted order of the carriers.
 */
describe('evaluateTransition', () => {
  it('covers the gap when somebody keeps a harmonic instrument across both songs', () => {
    const result = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums'] },
      { hugo: ['guitar'], gui: ['piano'] },
      INSTRUMENTS,
    );
    expect(result).toEqual({
      kind: 'covered',
      harmonicCarriers: [{ memberId: 'hugo', keptInstrumentIds: ['guitar'] }],
      supportCarriers: [],
    });
  });

  it('names the percussive and vocal keepers as support, behind the harmonic ones', () => {
    const result = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums', 'vocals'] },
      { hugo: ['guitar'], gui: ['drums', 'vocals'] },
      INSTRUMENTS,
    );
    expect(result.harmonicCarriers).toEqual([{ memberId: 'hugo', keptInstrumentIds: ['guitar'] }]);
    expect(result.supportCarriers).toEqual([
      { memberId: 'gui', keptInstrumentIds: ['drums', 'vocals'] },
    ]);
  });

  it('calls the transition risky when nobody keeps a harmonic instrument', () => {
    const result = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums'] },
      { hugo: ['drums'], gui: ['guitar'] },
      INSTRUMENTS,
    );
    expect(result).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('still names the support keepers on a risky transition', () => {
    const result = evaluateTransition({ gui: ['drums'] }, { gui: ['drums'] }, INSTRUMENTS);
    expect(result).toEqual({
      kind: 'risky',
      harmonicCarriers: [],
      supportCarriers: [{ memberId: 'gui', keptInstrumentIds: ['drums'] }],
    });
  });

  it('counts a member holding two instruments as a carrier through either of them', () => {
    const result = evaluateTransition({ gui: ['drums', 'piano'] }, { gui: ['piano'] }, INSTRUMENTS);
    expect(result).toEqual({
      kind: 'covered',
      harmonicCarriers: [{ memberId: 'gui', keptInstrumentIds: ['piano'] }],
      supportCarriers: [],
    });
  });

  it('treats a member sitting the second song out as keeping nothing', () => {
    const result = evaluateTransition({ hugo: ['guitar'] }, { hugo: [] }, INSTRUMENTS);
    expect(result).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('treats an absent member the same way as one sitting out', () => {
    const result = evaluateTransition({ hugo: ['guitar'] }, {}, INSTRUMENTS);
    expect(result.kind).toBe('risky');
  });

  it('ignores an instrument the lineup names but the instrument map does not', () => {
    const result = evaluateTransition({ hugo: ['ghost'] }, { hugo: ['ghost'] }, INSTRUMENTS);
    expect(result).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('leaves an instrument of the other family out of both lists', () => {
    const result = evaluateTransition({ hugo: ['triangle'] }, { hugo: ['triangle'] }, INSTRUMENTS);
    expect(result).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('sorts the carriers by member so two renders of one pair agree', () => {
    const result = evaluateTransition(
      { zoe: ['guitar'], alpha: ['piano'], mike: ['drums'] },
      { zoe: ['guitar'], alpha: ['piano'], mike: ['drums'] },
      INSTRUMENTS,
    );
    expect(result.harmonicCarriers.map((carrier) => carrier.memberId)).toEqual(['alpha', 'zoe']);
    expect(result.supportCarriers.map((carrier) => carrier.memberId)).toEqual(['mike']);
  });

  it('sorts the kept instruments of one carrier', () => {
    const result = evaluateTransition(
      { gui: ['vocals', 'drums'] },
      { gui: ['drums', 'vocals'] },
      INSTRUMENTS,
    );
    expect(result.supportCarriers[0]?.keptInstrumentIds).toEqual(['drums', 'vocals']);
  });
});
