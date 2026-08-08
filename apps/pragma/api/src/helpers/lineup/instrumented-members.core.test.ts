import { describe, expect, it } from 'vitest';
import { instrumentedMembers } from './instrumented-members.core';

describe('instrumentedMembers', () => {
  it('answers an empty list for an empty lineup', () => {
    expect(instrumentedMembers({})).toEqual([]);
  });

  it('keeps every member who holds an instrument, as a member/instrument pair', () => {
    expect(instrumentedMembers({ hugo: 'guitar', gui: 'drums' })).toEqual([
      ['hugo', 'guitar'],
      ['gui', 'drums'],
    ]);
  });

  it('drops the members who sit the song out', () => {
    expect(instrumentedMembers({ hugo: 'guitar', gui: null })).toEqual([['hugo', 'guitar']]);
  });

  it('answers an empty list when every member sits the song out', () => {
    expect(instrumentedMembers({ hugo: null, gui: null })).toEqual([]);
  });
});
