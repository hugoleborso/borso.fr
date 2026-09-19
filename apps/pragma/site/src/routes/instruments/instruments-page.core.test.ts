import { describe, expect, it } from 'vitest';
import {
  claimOfMember,
  type PlayedInstrument,
  selectInstrumentDeletionEffect,
  togglePrimacy,
} from './instruments-page.core';

// @FollowsBlueprint test-pure-unit
describe('selectInstrumentDeletionEffect', () => {
  it('empties the form when the deleted row is the one being edited', () => {
    expect(selectInstrumentDeletionEffect('guitar', 'guitar')).toBe('clear-form');
  });

  it('leaves the form alone when another row is deleted', () => {
    expect(selectInstrumentDeletionEffect('guitar', 'bass')).toBe('keep-form');
  });

  it('leaves the form alone when nothing is being edited', () => {
    expect(selectInstrumentDeletionEffect(null, 'bass')).toBe('keep-form');
  });
});

describe('claimOfMember', () => {
  const catalog: PlayedInstrument[] = [
    { id: 'guitar', players: [{ memberId: 'ana', isPrimary: true }] },
    {
      id: 'bass',
      players: [
        { memberId: 'ana', isPrimary: false },
        { memberId: 'ben', isPrimary: true },
      ],
    },
    { id: 'drums', players: [] },
  ];

  it('names every instrument the member plays and which of them is their main one', () => {
    expect(claimOfMember(catalog, 'ana')).toEqual({
      instrumentIds: ['guitar', 'bass'],
      primaryInstrumentIds: ['guitar'],
    });
  });

  it('reads a member who plays one instrument and calls it their main one', () => {
    expect(claimOfMember(catalog, 'ben')).toEqual({
      instrumentIds: ['bass'],
      primaryInstrumentIds: ['bass'],
    });
  });

  it('returns an empty claim for a member the band never linked to anything', () => {
    expect(claimOfMember(catalog, 'cam')).toEqual({
      instrumentIds: [],
      primaryInstrumentIds: [],
    });
  });
});

describe('togglePrimacy', () => {
  it('marks an instrument primary when it was not', () => {
    expect(togglePrimacy(['guitar'], 'bass')).toEqual(['guitar', 'bass']);
  });

  it('clears the primacy when it was already there', () => {
    expect(togglePrimacy(['guitar', 'bass'], 'guitar')).toEqual(['bass']);
  });
});
