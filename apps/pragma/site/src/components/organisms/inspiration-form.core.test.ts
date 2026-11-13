import { describe, expect, it } from 'vitest';
import {
  applyPickedHit,
  buildInspirationFields,
  changeTitle,
  EMPTY_INSPIRATION_FORM,
  readWholeSeconds,
  selectInspirationFormRefusal,
  shouldSearchDeezerFor,
  startInspirationForm,
} from './inspiration-form.core';

const LINK = 'https://youtu.be/dQw4w9WgXcQ';
const FILLED = {
  ...EMPTY_INSPIRATION_FORM,
  title: ' Call Me Maybe ',
  artist: ' Carly Rae Jepsen ',
  youtubeLink: LINK,
  startSeconds: 52,
  endSeconds: 64,
  note: ' the trumpet ',
};

// @FollowsBlueprint test-pure-unit
describe('the inspiration form', () => {
  it('fills the title, artist and Deezer ids from a picked hit, and a typed title clears them', () => {
    const picked = applyPickedHit(EMPTY_INSPIRATION_FORM, {
      title: 'Call Me Maybe',
      artist: 'Carly Rae Jepsen',
      deezerTrackId: '1234',
      deezerAlbumId: '5678',
    });
    expect(picked).toEqual(
      expect.objectContaining({
        title: 'Call Me Maybe',
        artist: 'Carly Rae Jepsen',
        deezerTrackId: '1234',
        deezerAlbumId: '5678',
      }),
    );
    expect(changeTitle(picked, 'Call Me')).toEqual(
      expect.objectContaining({ title: 'Call Me', deezerTrackId: null, deezerAlbumId: null }),
    );
  });

  it('searches Deezer for two typed letters or more, until a hit is picked', () => {
    expect(shouldSearchDeezerFor('Ca', null)).toBe(true);
    expect(shouldSearchDeezerFor('C', null)).toBe(false);
    expect(shouldSearchDeezerFor('Call Me Maybe', '1234')).toBe(false);
  });

  it('refuses a missing title, a link that is not a YouTube video, and a refused passage', () => {
    expect(selectInspirationFormRefusal(FILLED)).toBeNull();
    expect(selectInspirationFormRefusal({ ...FILLED, title: '  ' })).toBe('title-missing');
    expect(selectInspirationFormRefusal({ ...FILLED, youtubeLink: 'https://vimeo.com/1234' })).toBe(
      'not-a-youtube-link',
    );
    expect(selectInspirationFormRefusal({ ...FILLED, endSeconds: 52 })).toBe('end-not-after-start');
    expect(selectInspirationFormRefusal({ ...FILLED, endSeconds: 700 })).toBe('passage-too-long');
  });

  it('reads a typed second as a whole number, and anything else as 0:00', () => {
    expect(readWholeSeconds('64.8')).toBe(64);
    expect(readWholeSeconds('')).toBe(0);
    expect(readWholeSeconds('-3')).toBe(0);
    expect(readWholeSeconds('abc')).toBe(0);
  });

  it('sends trimmed text and the parsed video id', () => {
    expect(buildInspirationFields(FILLED, 'dQw4w9WgXcQ')).toEqual({
      youtubeVideoId: 'dQw4w9WgXcQ',
      title: 'Call Me Maybe',
      artist: 'Carly Rae Jepsen',
      deezerTrackId: null,
      deezerAlbumId: null,
      startSeconds: 52,
      endSeconds: 64,
      note: 'the trumpet',
    });
  });

  it('opens empty for a new inspiration, and filled in for an edit', () => {
    expect(startInspirationForm(null)).toBe(EMPTY_INSPIRATION_FORM);
    expect(
      startInspirationForm({
        id: 'inspiration-1',
        ...buildInspirationFields(FILLED, 'dQw4w9WgXcQ'),
      }),
    ).toEqual({
      ...FILLED,
      title: 'Call Me Maybe',
      artist: 'Carly Rae Jepsen',
      note: 'the trumpet',
      youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=52',
    });
  });
});
