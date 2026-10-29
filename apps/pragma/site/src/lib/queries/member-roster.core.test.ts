import { describe, expect, it } from 'vitest';
import { type CatalogInstrument, predictMemberRoster } from './member-roster.core';

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

// @FollowsBlueprint test-pure-unit
describe('predictMemberRoster', () => {
  it('reads a new instrument out of the catalog the list already holds', () => {
    expect(predictMemberRoster([], [GUITAR, BASS], ['bass'])).toEqual([BASS]);
  });

  it('keeps the requested instruments in the order they were sent', () => {
    expect(predictMemberRoster([GUITAR], [GUITAR, BASS], ['bass', 'guitar'])).toEqual([
      BASS,
      GUITAR,
    ]);
  });

  it('still predicts a roster when the catalog has not loaded, from what the member holds', () => {
    expect(predictMemberRoster([GUITAR, BASS], [], ['guitar'])).toEqual([GUITAR]);
  });

  it('drops an instrument neither the catalog nor the roster knows', () => {
    expect(predictMemberRoster([], [GUITAR], ['guitar', 'tuba'])).toEqual([GUITAR]);
  });

  it('prefers the catalog row over the stale one the roster carries', () => {
    const renamed: CatalogInstrument = { ...GUITAR, name: 'Nylon guitar' };
    expect(predictMemberRoster([GUITAR], [renamed], ['guitar'])).toEqual([renamed]);
  });
});
