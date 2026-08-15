import { describe, expect, it } from 'vitest';
import {
  compactLineup,
  findOrphanMemberIds,
  formatSetlistOrder,
  instrumentFamilyMap,
  instrumentNamesFor,
  lineupOf,
  prominentMemberInstrumentFor,
  selectUnwarnedMemberIds,
  tonalityLabelFor,
} from './setlist-editor.utils';

// @FollowsBlueprint test-pure-unit
describe('tonalityLabelFor', () => {
  it('returns null for an undefined song', () => {
    expect(tonalityLabelFor(undefined)).toBe(null);
  });

  it('returns null when the start tonality is null', () => {
    expect(
      tonalityLabelFor({
        id: 's1',
        title: 't',
        artist: 'a',
        defaultLineup: {},
        tonalityStart: null,
      }),
    ).toBe(null);
  });

  it('returns null when only the end tonality is known', () => {
    expect(
      tonalityLabelFor({
        id: 's1',
        title: 't',
        artist: 'a',
        defaultLineup: {},
        tonalityStart: null,
        tonalityEnd: 'G',
      }),
    ).toBe(null);
  });

  it('returns the start tonality alone when the end matches', () => {
    expect(
      tonalityLabelFor({
        id: 's1',
        title: 't',
        artist: 'a',
        defaultLineup: {},
        tonalityStart: 'C',
        tonalityEnd: 'C',
      }),
    ).toBe('C');
  });

  it('returns the start tonality alone when the end is null', () => {
    expect(
      tonalityLabelFor({
        id: 's1',
        title: 't',
        artist: 'a',
        defaultLineup: {},
        tonalityStart: 'C',
        tonalityEnd: null,
      }),
    ).toBe('C');
  });

  it('returns the arrow form when the end differs', () => {
    expect(
      tonalityLabelFor({
        id: 's1',
        title: 't',
        artist: 'a',
        defaultLineup: {},
        tonalityStart: 'C',
        tonalityEnd: 'G',
      }),
    ).toBe('C → G');
  });
});

describe('instrumentFamilyMap', () => {
  it('keys instruments by id and exposes their family', () => {
    const map = instrumentFamilyMap([
      { id: 'i1', name: 'Guitar', family: 'harmonic' },
      { id: 'i2', name: 'Drums', family: 'percussive' },
    ]);
    expect(map).toEqual({
      i1: { family: 'harmonic' },
      i2: { family: 'percussive' },
    });
  });
});

describe('instrumentNamesFor', () => {
  it('names every instrument it can resolve', () => {
    expect(
      instrumentNamesFor(['i1', 'i2'], { i1: { name: 'Guitar' }, i2: { name: 'Drums' } }),
    ).toEqual(['Guitar', 'Drums']);
  });

  it('drops an instrument the map does not know', () => {
    expect(instrumentNamesFor(['i1', 'gone'], { i1: { name: 'Guitar' } })).toEqual(['Guitar']);
  });
});

describe('lineupOf', () => {
  it('returns the override when present', () => {
    const lineup = lineupOf(
      { songId: 's1', lineupOverride: { m1: ['i1'] } },
      { s1: { id: 's1', title: 't', artist: 'a', defaultLineup: { m1: ['iX'] } } },
    );
    expect(lineup).toEqual({ m1: ['i1'] });
  });

  it('falls back to the song default lineup when no override', () => {
    const lineup = lineupOf(
      { songId: 's1', lineupOverride: null },
      { s1: { id: 's1', title: 't', artist: 'a', defaultLineup: { m1: ['iX'] } } },
    );
    expect(lineup).toEqual({ m1: ['iX'] });
  });

  it('returns an empty record when the song is missing', () => {
    expect(lineupOf({ songId: 's-missing', lineupOverride: null }, {})).toEqual({});
  });
});

describe('compactLineup', () => {
  it('drops the members holding nothing', () => {
    expect(compactLineup({ m1: ['i1'], m2: [] })).toEqual({ m1: ['i1'] });
  });

  it('keeps every instrument of a member holding two', () => {
    expect(compactLineup({ m1: ['i1', 'i2'] })).toEqual({ m1: ['i1', 'i2'] });
  });

  it('returns an empty object for an empty lineup', () => {
    expect(compactLineup({})).toEqual({});
  });
});

describe('findOrphanMemberIds', () => {
  it('returns an empty list when every member is known', () => {
    expect(findOrphanMemberIds({ m1: ['i1'], m2: ['i2'] }, new Set(['m1', 'm2']))).toEqual([]);
  });

  it('returns the lineup keys absent from the known set', () => {
    expect(findOrphanMemberIds({ m1: ['i1'], mGhost: ['i2'] }, new Set(['m1']))).toEqual([
      'mGhost',
    ]);
  });

  it('returns an empty list when the lineup is empty', () => {
    expect(findOrphanMemberIds({}, new Set(['m1']))).toEqual([]);
  });
});

describe('selectUnwarnedMemberIds', () => {
  it('keeps the orphans nobody has been told about', () => {
    expect(selectUnwarnedMemberIds(['mGhost', 'mOther'], new Set(['mGhost']))).toEqual(['mOther']);
  });

  it('drops every orphan once they have all been reported', () => {
    expect(selectUnwarnedMemberIds(['mGhost'], new Set(['mGhost']))).toEqual([]);
  });

  it('leaves an empty list empty', () => {
    expect(selectUnwarnedMemberIds([], new Set())).toEqual([]);
  });
});

describe('formatSetlistOrder', () => {
  const songsById = {
    s1: {
      id: 's1',
      title: 'Wagon Wheel',
      artist: 'Old Crow',
      defaultLineup: {},
      tonalityStart: 'A',
    },
    s2: {
      id: 's2',
      title: 'Ramble',
      artist: 'The Band',
      defaultLineup: {},
      tonalityStart: 'C',
      tonalityEnd: 'G',
    },
    s3: { id: 's3', title: 'Untuned', artist: 'Nobody', defaultLineup: {}, tonalityStart: null },
  };

  it('returns an empty string for an empty setlist', () => {
    expect(formatSetlistOrder([], songsById)).toBe('');
  });

  it('numbers each entry and appends the song tonality label', () => {
    expect(
      formatSetlistOrder(
        [
          { songId: 's1', keyOverride: null },
          { songId: 's2', keyOverride: null },
        ],
        songsById,
      ),
    ).toBe('1. Wagon Wheel — Old Crow (A)\n2. Ramble — The Band (C → G)');
  });

  it('prefers the entry key override over the song tonality', () => {
    expect(formatSetlistOrder([{ songId: 's1', keyOverride: 'D' }], songsById)).toBe(
      '1. Wagon Wheel — Old Crow (D)',
    );
  });

  it('omits the key suffix when neither override nor tonality is set', () => {
    expect(formatSetlistOrder([{ songId: 's3', keyOverride: null }], songsById)).toBe(
      '1. Untuned — Nobody',
    );
  });

  it('omits the key suffix when the override is an empty string', () => {
    expect(formatSetlistOrder([{ songId: 's3', keyOverride: '' }], songsById)).toBe(
      '1. Untuned — Nobody',
    );
  });

  it('renders a placeholder for a missing song id', () => {
    expect(formatSetlistOrder([{ songId: 'gone', keyOverride: null }], songsById)).toBe('1. ?');
  });
});

describe('prominentMemberInstrumentFor', () => {
  const members = { m1: { firstName: 'Hugo', color: '#abc' } };
  const instruments = { i1: { name: 'Guitar' } };

  it('returns null when no instrument id is supplied', () => {
    expect(prominentMemberInstrumentFor(undefined, 'm1', members, instruments)).toBe(null);
  });

  it('returns null when no member is selected', () => {
    expect(prominentMemberInstrumentFor(['i1'], null, members, instruments)).toBe(null);
  });

  it('returns null with no member selected, even against a member keyed "null"', () => {
    const keyedByNullText = { null: { firstName: 'Hugo', color: '#abc' } };
    expect(prominentMemberInstrumentFor(['i1'], null, keyedByNullText, instruments)).toBe(null);
  });

  it('returns null with no instrument id, even against an instrument keyed "undefined"', () => {
    const keyedByUndefinedText = { undefined: { name: 'Guitar' } };
    expect(prominentMemberInstrumentFor(undefined, 'm1', members, keyedByUndefinedText)).toBe(null);
  });

  it('returns null when the member id cannot be resolved', () => {
    expect(prominentMemberInstrumentFor(['i1'], 'unknown-member', members, instruments)).toBe(null);
  });

  it('returns null when the instrument id cannot be resolved', () => {
    expect(prominentMemberInstrumentFor(['unknown-instrument'], 'm1', members, instruments)).toBe(
      null,
    );
  });

  it('returns the resolved member name, colour and instrument names', () => {
    expect(prominentMemberInstrumentFor(['i1'], 'm1', members, instruments)).toEqual({
      memberName: 'Hugo',
      memberColor: '#abc',
      instrumentNames: ['Guitar'],
    });
  });

  it('names every instrument the member holds here', () => {
    const twoInstruments = { i1: { name: 'Guitar' }, i2: { name: 'Vocals' } };
    expect(prominentMemberInstrumentFor(['i1', 'i2'], 'm1', members, twoInstruments)).toEqual({
      memberName: 'Hugo',
      memberColor: '#abc',
      instrumentNames: ['Guitar', 'Vocals'],
    });
  });

  it('returns null when the member holds nothing here', () => {
    expect(prominentMemberInstrumentFor([], 'm1', members, instruments)).toBe(null);
  });
});
