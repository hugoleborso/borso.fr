import { describe, expect, it } from 'vitest';
import { selectSongNoteSections } from './song-notes.core';

// @FollowsBlueprint test-pure-unit
describe('selectSongNoteSections', () => {
  it('answers nothing when the song carries no note', () => {
    expect(selectSongNoteSections({ structureNotes: '', gimmickNotes: '  ', notes: '' })).toEqual(
      [],
    );
  });

  it('reads the sections in the order the band reads them', () => {
    expect(
      selectSongNoteSections({
        structureNotes: 'intro ×4',
        gimmickNotes: 'break',
        notes: 'baisser le gain',
      }),
    ).toEqual([
      { kind: 'structure', text: 'intro ×4' },
      { kind: 'gimmicks', text: 'break' },
      { kind: 'notes', text: 'baisser le gain' },
    ]);
  });

  it('keeps only the sections that say something, trimmed', () => {
    expect(
      selectSongNoteSections({ structureNotes: '', gimmickNotes: '  break  ', notes: '' }),
    ).toEqual([{ kind: 'gimmicks', text: 'break' }]);
  });
});
