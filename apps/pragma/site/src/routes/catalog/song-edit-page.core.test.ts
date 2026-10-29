import { describe, expect, it } from 'vitest';
import { readSongEditSection, toggleLineupInstrument } from './song-edit-page.core';

// @FollowsBlueprint test-pure-unit
describe('readSongEditSection', () => {
  it('reads a section named in the address', () => {
    expect(readSongEditSection('lineup')).toBe('lineup');
    expect(readSongEditSection('notes')).toBe('notes');
  });

  it('opens on the identity of the song for a missing or unknown section', () => {
    expect(readSongEditSection(null)).toBe('identity');
    expect(readSongEditSection('chart')).toBe('identity');
  });
});

describe('toggleLineupInstrument', () => {
  const lineup = { lea: ['bass'], hugo: ['guitar', 'voice'] };

  it('gives a member an instrument they did not hold, keeping the others', () => {
    expect(toggleLineupInstrument(lineup, 'lea', 'voice')).toEqual({
      lea: ['bass', 'voice'],
      hugo: ['guitar', 'voice'],
    });
  });

  it('takes back an instrument the member held', () => {
    expect(toggleLineupInstrument(lineup, 'hugo', 'guitar')).toEqual({
      lea: ['bass'],
      hugo: ['voice'],
    });
  });

  it('seats a member the lineup did not name yet, and leaves the lineup it was given alone', () => {
    expect(toggleLineupInstrument(lineup, 'marc', 'drums')).toEqual({
      lea: ['bass'],
      hugo: ['guitar', 'voice'],
      marc: ['drums'],
    });
    expect(lineup).toEqual({ lea: ['bass'], hugo: ['guitar', 'voice'] });
  });
});
