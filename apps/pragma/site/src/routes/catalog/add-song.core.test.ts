import { describe, expect, it } from 'vitest';
import {
  applyPickedTrack,
  buildNewSongPayload,
  canAddSong,
  shouldSearchMusicServiceFor,
  startAddSongDraft,
} from './add-song.core';

const TRACK = {
  deezerTrackId: '67238735',
  title: 'Get Lucky',
  artist: 'Daft Punk',
  album: 'Random Access Memories',
  deezerAlbumId: '6575789',
  durationSeconds: 369,
  isrcs: ['USQX91300108'],
};

describe('startAddSongDraft', () => {
  it('starts from the typed title, as an idea with no artist', () => {
    expect(startAddSongDraft('Get')).toEqual({
      title: 'Get',
      artist: '',
      status: 'idea',
      pickedTrack: null,
    });
  });
});

describe('applyPickedTrack', () => {
  it('fills the title and the artist from the picked track and keeps the status', () => {
    const draft = { ...startAddSongDraft('get luck'), status: 'wip' as const };
    expect(applyPickedTrack(draft, TRACK)).toEqual({
      title: 'Get Lucky',
      artist: 'Daft Punk',
      status: 'wip',
      pickedTrack: TRACK,
    });
  });
});

describe('canAddSong', () => {
  it('needs a title', () => {
    expect(canAddSong(startAddSongDraft('  '))).toBe(false);
    expect(canAddSong(startAddSongDraft('Get Lucky'))).toBe(true);
  });
});

describe('shouldSearchMusicServiceFor', () => {
  it('searches once two letters are typed and no track is picked', () => {
    expect(shouldSearchMusicServiceFor('G', null)).toBe(false);
    expect(shouldSearchMusicServiceFor('Ge', null)).toBe(true);
    expect(shouldSearchMusicServiceFor('Get Lucky', TRACK)).toBe(false);
  });
});

describe('buildNewSongPayload', () => {
  it('sends the typed fields alone when no track was picked', () => {
    expect(buildNewSongPayload({ ...startAddSongDraft(' Riff '), artist: ' Us ' })).toEqual({
      title: 'Riff',
      artist: 'Us',
      status: 'idea',
    });
  });

  it("carries the picked track's album, cover, length and codes", () => {
    expect(buildNewSongPayload(applyPickedTrack(startAddSongDraft(''), TRACK))).toEqual({
      title: 'Get Lucky',
      artist: 'Daft Punk',
      status: 'idea',
      album: 'Random Access Memories',
      deezerTrackId: '67238735',
      deezerAlbumId: '6575789',
      durationSeconds: 369,
      isrcs: ['USQX91300108'],
    });
  });
});
