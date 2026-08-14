import { describe, expect, it } from 'vitest';
import {
  instrumentedMembers,
  instrumentsHeldBy,
  memberInstrumentPairs,
  normalizeLineup,
  resolveLineup,
} from './lineup.core';

// @FollowsBlueprint test-pure-unit
describe('normalizeLineup', () => {
  it('keeps a list of instruments as it is', () => {
    expect(normalizeLineup({ hugo: ['drums', 'vocals'] })).toEqual({ hugo: ['drums', 'vocals'] });
  });

  it('lifts a single instrument id written before one member could hold two', () => {
    expect(normalizeLineup({ hugo: 'guitar' })).toEqual({ hugo: ['guitar'] });
  });

  it('reads a null as the member sitting the song out', () => {
    expect(normalizeLineup({ hugo: null })).toEqual({ hugo: [] });
  });

  it('reads an empty string the same way, since a select with no choice sends one', () => {
    expect(normalizeLineup({ hugo: '' })).toEqual({ hugo: [] });
  });

  it('drops empty entries from a list', () => {
    expect(normalizeLineup({ hugo: ['guitar', ''] })).toEqual({ hugo: ['guitar'] });
  });

  it('answers an empty lineup for an empty record', () => {
    expect(normalizeLineup({})).toEqual({});
  });
});

describe('resolveLineup', () => {
  it('returns the default when the override is null', () => {
    expect(resolveLineup({ hugo: ['guitar'], gui: ['drums'] }, null)).toEqual({
      hugo: ['guitar'],
      gui: ['drums'],
    });
  });

  it('keeps default members not mentioned in the override', () => {
    expect(resolveLineup({ hugo: ['guitar'], gui: ['drums'] }, { hugo: ['piano'] })).toEqual({
      hugo: ['piano'],
      gui: ['drums'],
    });
  });

  it('respects an explicit empty list in the override (member sits out)', () => {
    expect(resolveLineup({ hugo: ['guitar'] }, { hugo: [] })).toEqual({ hugo: [] });
  });

  it('adds members present only in the override', () => {
    expect(resolveLineup({ hugo: ['guitar'] }, { gui: ['drums'] })).toEqual({
      hugo: ['guitar'],
      gui: ['drums'],
    });
  });

  it('returns a new object — does not mutate the default', () => {
    const defaultLineup = { hugo: ['guitar'] };
    const resolved = resolveLineup(defaultLineup, { hugo: ['piano'] });
    expect(defaultLineup).toEqual({ hugo: ['guitar'] });
    expect(resolved).toEqual({ hugo: ['piano'] });
  });

  it('returns a fresh copy of the default when the override is null', () => {
    const defaultLineup = { hugo: ['guitar'] };
    const resolved = resolveLineup(defaultLineup, null);
    expect(resolved).toEqual(defaultLineup);
    expect(resolved).not.toBe(defaultLineup);
  });
});

describe('instrumentedMembers', () => {
  it('answers an empty list for an empty lineup', () => {
    expect(instrumentedMembers({})).toEqual([]);
  });

  it('keeps every member holding at least one instrument, with all of them', () => {
    expect(instrumentedMembers({ hugo: ['drums', 'vocals'], gui: ['bass'] })).toEqual([
      ['hugo', ['drums', 'vocals']],
      ['gui', ['bass']],
    ]);
  });

  it('drops the members who sit the song out', () => {
    expect(instrumentedMembers({ hugo: ['guitar'], gui: [] })).toEqual([['hugo', ['guitar']]]);
  });
});

describe('memberInstrumentPairs', () => {
  it('answers one pair per instrument held', () => {
    expect(memberInstrumentPairs({ hugo: ['drums', 'vocals'], gui: ['bass'] })).toEqual([
      ['hugo', 'drums'],
      ['hugo', 'vocals'],
      ['gui', 'bass'],
    ]);
  });

  it('answers nothing when nobody plays', () => {
    expect(memberInstrumentPairs({ hugo: [] })).toEqual([]);
  });
});

describe('instrumentsHeldBy', () => {
  it('answers the instruments the lineup names for the member', () => {
    expect(instrumentsHeldBy({ hugo: ['drums', 'vocals'] }, 'hugo')).toEqual(['drums', 'vocals']);
  });

  it('answers an empty list for a member the lineup never mentions', () => {
    expect(instrumentsHeldBy({ hugo: ['drums'] }, 'gui')).toEqual([]);
  });
});
