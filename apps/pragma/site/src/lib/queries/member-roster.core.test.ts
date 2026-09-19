import { describe, expect, it } from 'vitest';
import {
  type CatalogInstrument,
  predictMemberRoster,
  type RosterInstrument,
} from './member-roster.core';

const GUITAR: CatalogInstrument = {
  id: 'guitar',
  name: 'Guitar',
  family: 'harmonic',
  icon: 'guitar',
  position: 1,
};
const BASS: CatalogInstrument = {
  id: 'bass',
  name: 'Bass',
  family: 'harmonic',
  icon: 'bass',
  position: 2,
};

function held(instrument: CatalogInstrument, isPrimary: boolean): RosterInstrument {
  return { ...instrument, isPrimary };
}

// @FollowsBlueprint test-pure-unit
describe('predictMemberRoster', () => {
  it('reads a new instrument out of the catalog the list already holds', () => {
    expect(predictMemberRoster([], [GUITAR, BASS], ['bass'], undefined)).toEqual([
      held(BASS, false),
    ]);
  });

  it('keeps a primacy the member already had on an instrument they still play', () => {
    expect(
      predictMemberRoster(
        [held(GUITAR, true), held(BASS, false)],
        [GUITAR, BASS],
        ['guitar'],
        undefined,
      ),
    ).toEqual([held(GUITAR, true)]);
  });

  it('takes the requested primacy over the one that was there', () => {
    expect(
      predictMemberRoster([held(GUITAR, true)], [GUITAR, BASS], ['guitar', 'bass'], ['bass']),
    ).toEqual([held(GUITAR, false), held(BASS, true)]);
  });

  it('still predicts a roster when the catalog has not loaded, from what the member holds', () => {
    expect(
      predictMemberRoster([held(GUITAR, true), held(BASS, false)], [], ['guitar'], undefined),
    ).toEqual([held(GUITAR, true)]);
  });

  it('drops an instrument neither the catalog nor the roster knows', () => {
    expect(predictMemberRoster([], [GUITAR], ['guitar', 'tuba'], undefined)).toEqual([
      held(GUITAR, false),
    ]);
  });

  it('prefers the catalog row over the stale one the roster carries', () => {
    const renamed: CatalogInstrument = { ...GUITAR, name: 'Nylon guitar' };
    expect(predictMemberRoster([held(GUITAR, true)], [renamed], ['guitar'], undefined)).toEqual([
      held(renamed, true),
    ]);
  });
});
