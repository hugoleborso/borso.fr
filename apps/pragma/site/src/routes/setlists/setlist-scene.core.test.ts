import { describe, expect, it } from 'vitest';
import {
  buildSceneHeadline,
  composeSceneSubtitle,
  buildScenePills,
  clampSceneIndex,
  computeSceneProgressPercent,
  formatSceneOrdinal,
  formatScenePosition,
  resolveSceneIndex,
  type SceneEntryInput,
  type SceneSongInput,
  selectSceneKeyCommand,
} from './setlist-scene.core';

function entry(overrides: Partial<SceneEntryInput> = {}): SceneEntryInput {
  return {
    id: 'entry-1',
    songId: 'song-1',
    energy: null,
    keyOverride: null,
    capo: null,
    ...overrides,
  };
}

function song(overrides: Partial<SceneSongInput> = {}): SceneSongInput {
  return {
    title: 'Take Five',
    artist: 'Dave Brubeck',
    tonalityStart: 'Ebm',
    tonalityEnd: null,
    baseEnergy: 6,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('selectSceneKeyCommand', () => {
  it('reads the two keys a thumb finds on a phone keyboard as next', () => {
    expect(selectSceneKeyCommand('ArrowRight')).toBe('next');
    expect(selectSceneKeyCommand('PageDown')).toBe('next');
  });

  it('reads the two keys going the other way as previous', () => {
    expect(selectSceneKeyCommand('ArrowLeft')).toBe('previous');
    expect(selectSceneKeyCommand('PageUp')).toBe('previous');
  });

  it('leaves every other key to the browser, so the chart still scrolls', () => {
    expect(selectSceneKeyCommand('ArrowDown')).toBeNull();
    expect(selectSceneKeyCommand(' ')).toBeNull();
  });
});

describe('clampSceneIndex', () => {
  it('keeps an index inside the set', () => {
    expect(clampSceneIndex(3, 12)).toBe(3);
  });

  it('stops at the last song', () => {
    expect(clampSceneIndex(40, 12)).toBe(11);
  });

  it('stops at the first song', () => {
    expect(clampSceneIndex(-4, 12)).toBe(0);
  });

  it('answers zero for an empty set', () => {
    expect(clampSceneIndex(2, 0)).toBe(0);
  });
});

describe('resolveSceneIndex', () => {
  it('walks forward', () => {
    expect(resolveSceneIndex('next', 2, 12)).toBe(3);
  });

  it('walks back', () => {
    expect(resolveSceneIndex('previous', 2, 12)).toBe(1);
  });

  it('holds on the last song rather than wrapping to the first', () => {
    expect(resolveSceneIndex('next', 11, 12)).toBe(11);
  });

  it('holds on the first song rather than wrapping to the last', () => {
    expect(resolveSceneIndex('previous', 0, 12)).toBe(0);
  });
});

describe('formatSceneOrdinal', () => {
  it('counts from one and pads to two digits', () => {
    expect(formatSceneOrdinal(0)).toBe('01');
  });

  it('leaves a two digit ordinal alone', () => {
    expect(formatSceneOrdinal(11)).toBe('12');
  });
});

describe('formatScenePosition', () => {
  it('reads as the position out of the total', () => {
    expect(formatScenePosition(2, 12)).toBe('03 / 12');
  });
});

describe('computeSceneProgressPercent', () => {
  it('fills the bar on the last song', () => {
    expect(computeSceneProgressPercent(11, 12)).toBe(100);
  });

  it('counts the current song as played', () => {
    expect(computeSceneProgressPercent(0, 4)).toBe(25);
  });

  it('stays empty for a set with no song', () => {
    expect(computeSceneProgressPercent(0, 0)).toBe(0);
  });

  it('clamps an index past the end', () => {
    expect(computeSceneProgressPercent(99, 4)).toBe(100);
  });
});

describe('buildScenePills', () => {
  const setlistEntries = [
    entry({ id: 'entry-1', songId: 'song-1' }),
    entry({ id: 'entry-2', songId: 'song-2' }),
    entry({ id: 'entry-3', songId: 'song-3', keyOverride: 'F#m' }),
    entry({ id: 'entry-4', songId: 'song-missing' }),
  ];
  const songsById = {
    'song-1': song({ title: 'Take Five' }),
    'song-2': song({ title: 'Helpless', tonalityStart: 'D', tonalityEnd: 'E' }),
    'song-3': song({ title: 'So What' }),
  };

  it('marks the song being played, the one before it and the one after it', () => {
    const pills = buildScenePills(setlistEntries, songsById, 1);
    expect(pills.map((pill) => pill.state)).toEqual(['done', 'current', 'next', 'upcoming']);
  });

  it('numbers the pills from one', () => {
    const pills = buildScenePills(setlistEntries, songsById, 0);
    expect(pills.map((pill) => pill.ordinal)).toEqual(['01', '02', '03', '04']);
  });

  it('prefers the entry key over the song tonality', () => {
    const pills = buildScenePills(setlistEntries, songsById, 0);
    expect(pills[2]?.subtitle).toBe('Dave Brubeck · F#m');
  });

  it('reads a modulation as the walk between the two keys', () => {
    const pills = buildScenePills(setlistEntries, songsById, 0);
    expect(pills[1]?.subtitle).toBe('Dave Brubeck · D → E');
  });

  it('leaves the title empty for an entry whose song left the catalogue', () => {
    const pills = buildScenePills(setlistEntries, songsById, 0);
    expect(pills[3]).toMatchObject({ title: null, subtitle: '' });
  });

  it('answers with nothing for an empty set', () => {
    expect(buildScenePills([], songsById, 0)).toEqual([]);
  });
});

describe('composeSceneSubtitle', () => {
  it('joins the artist and the key', () => {
    expect(composeSceneSubtitle('Dave Brubeck', 'Ebm')).toBe('Dave Brubeck · Ebm');
  });

  it('drops the separator when the song carries no key', () => {
    expect(composeSceneSubtitle('Dave Brubeck', null)).toBe('Dave Brubeck');
  });

  it('drops the separator when the song carries no artist', () => {
    expect(composeSceneSubtitle('', 'Ebm')).toBe('Ebm');
  });
});

describe('buildSceneHeadline', () => {
  it('carries what a player reads above the chart', () => {
    expect(buildSceneHeadline(entry({ energy: 8, capo: 2 }), song())).toEqual({
      title: 'Take Five',
      artist: 'Dave Brubeck',
      tonalityLabel: 'Ebm',
      energy: 8,
      capo: 2,
    });
  });

  it('falls back to the song energy when the entry sets none', () => {
    expect(buildSceneHeadline(entry(), song({ baseEnergy: 4 })).energy).toBe(4);
  });

  it('reports no energy when neither the entry nor the song carries one', () => {
    expect(buildSceneHeadline(entry(), song({ baseEnergy: null })).energy).toBeNull();
  });

  it('survives an entry whose song left the catalogue', () => {
    expect(buildSceneHeadline(entry(), undefined)).toEqual({
      title: null,
      artist: '',
      tonalityLabel: null,
      energy: null,
      capo: null,
    });
  });

  it('keeps the entry key when the song is gone', () => {
    expect(buildSceneHeadline(entry({ keyOverride: 'Am' }), undefined).tonalityLabel).toBe('Am');
  });

  it('answers an empty headline for an index no entry sits at', () => {
    expect(buildSceneHeadline(undefined, undefined)).toEqual({
      title: null,
      artist: '',
      tonalityLabel: null,
      energy: null,
      capo: null,
    });
  });
});
