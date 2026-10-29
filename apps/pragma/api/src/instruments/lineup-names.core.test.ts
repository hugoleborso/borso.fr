import { describe, expect, it } from 'vitest';
import {
  type LineupNames,
  listNameCandidates,
  nameEntity,
  nameLineup,
  resolveNamedLineup,
} from './lineup-names.core';

const NAMES: LineupNames = {
  members: [
    { id: 'member-hugo', name: 'Hugo' },
    { id: 'member-lea', name: 'Léa' },
  ],
  instruments: [
    { id: 'instrument-drums', name: 'Batterie' },
    { id: 'instrument-voice', name: 'Chant' },
    { id: 'instrument-guitar', name: 'Guitare' },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('listNameCandidates', () => {
  it('labels each entity with its name', () => {
    expect(listNameCandidates(NAMES.members)).toEqual([
      { id: 'member-hugo', label: 'Hugo' },
      { id: 'member-lea', label: 'Léa' },
    ]);
  });
});

describe('nameEntity', () => {
  it('names a known entity, and keeps the id of one that is gone', () => {
    expect(nameEntity(NAMES.members, 'member-lea')).toBe('Léa');
    expect(nameEntity(NAMES.members, 'member-gone')).toBe('member-gone');
  });
});

describe('nameLineup', () => {
  it('names each member with the instruments they hold, and leaves out a member sitting out', () => {
    expect(
      nameLineup(
        {
          'member-hugo': ['instrument-drums', 'instrument-voice'],
          'member-lea': [],
          'member-gone': ['instrument-guitar'],
        },
        NAMES,
      ),
    ).toEqual({ Hugo: 'Batterie, Chant', 'member-gone': 'Guitare' });
  });
});

describe('resolveNamedLineup', () => {
  it('resolves members and instruments given by name or by id, one or several each', () => {
    expect(
      resolveNamedLineup(
        { hugo: ['batterie', 'instrument-voice'], 'member-lea': 'Guitare' },
        NAMES,
      ),
    ).toEqual({
      kind: 'resolved',
      lineup: {
        'member-hugo': ['instrument-drums', 'instrument-voice'],
        'member-lea': ['instrument-guitar'],
      },
    });
  });

  it('keeps a member given null as sitting out', () => {
    expect(resolveNamedLineup({ Léa: null }, NAMES)).toEqual({
      kind: 'resolved',
      lineup: { 'member-lea': [] },
    });
  });

  it('names the member nobody in the band matches', () => {
    expect(resolveNamedLineup({ Marc: 'Basse' }, NAMES)).toEqual({
      kind: 'unresolved',
      noun: 'member',
      reference: 'Marc',
      match: { kind: 'missing' },
    });
  });

  it('names the instrument that matches several', () => {
    expect(resolveNamedLineup({ Hugo: 'a' }, NAMES)).toEqual({
      kind: 'unresolved',
      noun: 'instrument',
      reference: 'a',
      match: {
        kind: 'ambiguous',
        candidates: [
          { id: 'instrument-drums', label: 'Batterie' },
          { id: 'instrument-voice', label: 'Chant' },
          { id: 'instrument-guitar', label: 'Guitare' },
        ],
      },
    });
  });
});
