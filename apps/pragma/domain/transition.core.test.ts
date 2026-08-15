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
    const transition = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums'] },
      { hugo: ['guitar'], gui: ['piano'] },
      INSTRUMENTS,
    );
    expect(transition).toEqual({
      kind: 'covered',
      harmonicCarriers: [{ memberId: 'hugo', keptInstrumentIds: ['guitar'] }],
      supportCarriers: [],
    });
  });

  it('names the percussive and vocal keepers as support, behind the harmonic ones', () => {
    const transition = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums', 'vocals'] },
      { hugo: ['guitar'], gui: ['drums', 'vocals'] },
      INSTRUMENTS,
    );
    expect(transition.harmonicCarriers).toEqual([
      { memberId: 'hugo', keptInstrumentIds: ['guitar'] },
    ]);
    expect(transition.supportCarriers).toEqual([
      { memberId: 'gui', keptInstrumentIds: ['drums', 'vocals'] },
    ]);
  });

  it('calls the transition risky when nobody keeps a harmonic instrument', () => {
    const transition = evaluateTransition(
      { hugo: ['guitar'], gui: ['drums'] },
      { hugo: ['drums'], gui: ['guitar'] },
      INSTRUMENTS,
    );
    expect(transition).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('still names the support keepers on a risky transition', () => {
    const transition = evaluateTransition({ gui: ['drums'] }, { gui: ['drums'] }, INSTRUMENTS);
    expect(transition).toEqual({
      kind: 'risky',
      harmonicCarriers: [],
      supportCarriers: [{ memberId: 'gui', keptInstrumentIds: ['drums'] }],
    });
  });

  it('counts a member holding two instruments as a carrier through either of them', () => {
    const transition = evaluateTransition(
      { gui: ['drums', 'piano'] },
      { gui: ['piano'] },
      INSTRUMENTS,
    );
    expect(transition).toEqual({
      kind: 'covered',
      harmonicCarriers: [{ memberId: 'gui', keptInstrumentIds: ['piano'] }],
      supportCarriers: [],
    });
  });

  it('treats a member sitting the second song out as keeping nothing', () => {
    const transition = evaluateTransition({ hugo: ['guitar'] }, { hugo: [] }, INSTRUMENTS);
    expect(transition).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('treats an absent member the same way as one sitting out', () => {
    const transition = evaluateTransition({ hugo: ['guitar'] }, {}, INSTRUMENTS);
    expect(transition.kind).toBe('risky');
  });

  it('ignores an instrument the lineup names but the instrument map does not', () => {
    const transition = evaluateTransition({ hugo: ['ghost'] }, { hugo: ['ghost'] }, INSTRUMENTS);
    expect(transition).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('leaves an instrument of the other family out of both lists', () => {
    const transition = evaluateTransition(
      { hugo: ['triangle'] },
      { hugo: ['triangle'] },
      INSTRUMENTS,
    );
    expect(transition).toEqual({ kind: 'risky', harmonicCarriers: [], supportCarriers: [] });
  });

  it('sorts the carriers by member so two renders of one pair agree', () => {
    const transition = evaluateTransition(
      { zoe: ['guitar'], alpha: ['piano'], mike: ['drums'] },
      { zoe: ['guitar'], alpha: ['piano'], mike: ['drums'] },
      INSTRUMENTS,
    );
    expect(transition.harmonicCarriers.map((carrier) => carrier.memberId)).toEqual([
      'alpha',
      'zoe',
    ]);
    expect(transition.supportCarriers.map((carrier) => carrier.memberId)).toEqual(['mike']);
  });

  it('sorts the kept instruments of one carrier', () => {
    const transition = evaluateTransition(
      { gui: ['vocals', 'drums'] },
      { gui: ['drums', 'vocals'] },
      INSTRUMENTS,
    );
    expect(transition.supportCarriers[0]?.keptInstrumentIds).toEqual(['drums', 'vocals']);
  });
});
